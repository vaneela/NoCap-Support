package com.support.desk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.File;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TicketFlowIntegrationTest {

    private static final String SEED_PASSWORD = "seed-pass-123";
    private static final String PASSWORD = "s3cret-pass";

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) throws IOException {
        File db = File.createTempFile("support-test", ".db");
        db.deleteOnExit();
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + db.getAbsolutePath() + "?foreign_keys=on");
        registry.add("app.seed-password", () -> SEED_PASSWORD);
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    private record Staff(long id, String token) {
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, String body) throws Exception {
        if (token != null) {
            req.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(req.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions fetch(String path, String token) throws Exception {
        MockHttpServletRequestBuilder req = get(path);
        if (token != null) {
            req.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return mvc.perform(req);
    }

    private JsonNode read(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    private String login(String path, String email, String password) throws Exception {
        return read(send(post(path), null, """
                {"email":"%s","password":"%s"}""".formatted(email, password))
                .andExpect(status().isOk())).get("token").asText();
    }

    private String adminToken() throws Exception {
        return login("/api/auth/staff/login", "admin@support.local", SEED_PASSWORD);
    }

    private Staff createStaff(String adminToken, String name, String email, String role) throws Exception {
        long id = read(send(post("/api/agents"), adminToken, """
                {"name":"%s","email":"%s","password":"%s","role":"%s"}""".formatted(name, email, PASSWORD, role))
                .andExpect(status().isCreated())).get("id").asLong();
        return new Staff(id, login("/api/auth/staff/login", email, PASSWORD));
    }

    private String registerCustomer(String name, String email) throws Exception {
        return read(send(post("/api/auth/register"), null, """
                {"name":"%s","email":"%s","password":"%s"}""".formatted(name, email, PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.type").value("CUSTOMER"))).get("token").asText();
    }

    private long createTicket(String customerToken) throws Exception {
        return read(send(post("/api/tickets"), customerToken, """
                {"subject":"Cannot login","description":"Password reset email never arrives"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.messages.length()").value(1))).get("id").asLong();
    }

    @Test
    void authentication() throws Exception {
        fetch("/api/tickets", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").exists());
        fetch("/api/tickets", "not-a-jwt").andExpect(status().isUnauthorized());
        fetch("/api/agents", null).andExpect(status().isUnauthorized());

        String customer = registerCustomer("Eve", "eve-auth@example.com");
        send(post("/api/auth/register"), null,
                "{\"name\":\"Eve2\",\"email\":\"EVE-auth@example.com\",\"password\":\"" + PASSWORD + "\"}")
                .andExpect(status().isConflict());
        send(post("/api/auth/register"), null, "{\"name\":\"X\",\"email\":\"x-auth@example.com\",\"password\":\"short\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());

        send(post("/api/auth/login"), null, "{\"email\":\"eve-auth@example.com\",\"password\":\"wrong-pass\"}")
                .andExpect(status().isUnauthorized());
        send(post("/api/auth/staff/login"), null,
                "{\"email\":\"eve-auth@example.com\",\"password\":\"" + PASSWORD + "\"}")
                .andExpect(status().isUnauthorized());
        login("/api/auth/login", "Eve-Auth@example.com", PASSWORD);

        fetch("/api/auth/me", customer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("CUSTOMER"))
                .andExpect(jsonPath("$.email").value("eve-auth@example.com"));

        fetch("/api/agents", customer).andExpect(status().isForbidden());
        send(post("/api/agents"), customer,
                "{\"name\":\"Hax\",\"email\":\"hax@test.local\",\"password\":\"" + PASSWORD + "\"}")
                .andExpect(status().isForbidden());
        long id = createTicket(customer);
        send(patch("/api/tickets/" + id + "/status"), customer, "{\"status\":\"SOLVED\"}")
                .andExpect(status().isForbidden());
        send(put("/api/tickets/" + id + "/assignee"), customer, "{\"agentId\":null}")
                .andExpect(status().isForbidden());

        String admin = adminToken();
        fetch("/api/auth/me", admin)
                .andExpect(jsonPath("$.type").value("STAFF"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
        fetch("/api/agents", admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
        send(post("/api/tickets"), admin, "{\"subject\":\"s\",\"description\":\"d\"}")
                .andExpect(status().isForbidden());
    }

    @Test
    void fullTicketLifecycle() throws Exception {
        String admin = adminToken();
        Staff agentA = createStaff(admin, "Agent A", "a-flow@test.local", "AGENT");
        Staff agentB = createStaff(admin, "Agent B", "b-flow@test.local", "AGENT");
        String customer = registerCustomer("Dana", "dana-flow@example.com");
        long id = createTicket(customer);

        send(put("/api/tickets/" + id + "/assignee"), admin, "{\"agentId\":" + agentA.id() + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.id").value(agentA.id()));
        send(put("/api/tickets/" + id + "/assignee"), admin, "{\"agentId\":" + agentB.id() + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.id").value(agentB.id()));

        send(post("/api/tickets/" + id + "/messages"), agentB.token(), "{\"body\":\"Can you check spam?\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorType").value("AGENT"))
                .andExpect(jsonPath("$.authorName").value("Agent B"));

        send(patch("/api/tickets/" + id + "/status"), agentB.token(), "{\"status\":\"PENDING\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        send(post("/api/tickets/" + id + "/messages"), customer, "{\"body\":\"Not in spam either\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorType").value("REQUESTER"))
                .andExpect(jsonPath("$.authorName").value("Dana"));

        fetch("/api/tickets/" + id, customer).andExpect(jsonPath("$.status").value("OPEN"));

        send(patch("/api/tickets/" + id + "/status"), agentB.token(), "{\"status\":\"CLOSED\"}")
                .andExpect(status().isConflict());
        send(patch("/api/tickets/" + id + "/status"), agentB.token(), "{\"status\":\"SOLVED\"}")
                .andExpect(status().isOk());
        send(patch("/api/tickets/" + id + "/status"), agentB.token(), "{\"status\":\"CLOSED\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedTransitions.length()").value(0));

        send(post("/api/tickets/" + id + "/messages"), customer, "{\"body\":\"one more thing\"}")
                .andExpect(status().isConflict());

        JsonNode thread = read(fetch("/api/tickets/" + id + "/messages", customer).andExpect(status().isOk()));
        assertThat(thread.get(0).get("body").asText()).isEqualTo("Password reset email never arrives");
        assertThat(thread.findValuesAsText("authorType")).contains("REQUESTER", "AGENT", "SYSTEM");
        long prev = Long.MIN_VALUE;
        for (JsonNode m : thread) {
            assertThat(m.get("id").asLong()).isGreaterThan(prev);
            prev = m.get("id").asLong();
        }

        fetch("/api/tickets?status=CLOSED&assigneeId=" + agentB.id(), admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").exists());
    }

    @Test
    void roleBasedAccess() throws Exception {
        String admin = adminToken();
        Staff agentA = createStaff(admin, "RBAC A", "a-rbac@test.local", "AGENT");
        Staff agentB = createStaff(admin, "RBAC B", "b-rbac@test.local", "AGENT");
        String customer1 = registerCustomer("Cust One", "one-rbac@example.com");
        String customer2 = registerCustomer("Cust Two", "two-rbac@example.com");
        long t1 = createTicket(customer1);
        long t2 = createTicket(customer1);
        long t3 = createTicket(customer2);

        send(post("/api/agents"), agentA.token(),
                "{\"name\":\"X\",\"email\":\"x-rbac@test.local\",\"password\":\"" + PASSWORD + "\"}")
                .andExpect(status().isForbidden());

        send(put("/api/tickets/" + t1 + "/assignee"), admin, "{\"agentId\":" + agentA.id() + "}")
                .andExpect(status().isOk());

        fetch("/api/tickets", agentB.token())
                .andExpect(jsonPath("$[?(@.id == " + t1 + ")]").doesNotExist())
                .andExpect(jsonPath("$[?(@.id == " + t2 + ")]").exists());
        fetch("/api/tickets", admin).andExpect(jsonPath("$[?(@.id == " + t1 + ")]").exists());
        fetch("/api/tickets/" + t1, agentB.token()).andExpect(status().isForbidden());
        send(post("/api/tickets/" + t1 + "/messages"), admin, "{\"body\":\"Admin chiming in\"}")
                .andExpect(status().isForbidden());
        send(post("/api/tickets/" + t3 + "/messages"), admin, "{\"body\":\"Unassigned\"}")
                .andExpect(status().isForbidden());
        send(post("/api/tickets/" + t1 + "/messages"), agentA.token(), "{\"body\":\"Assignee reply\"}")
                .andExpect(status().isCreated());

        send(put("/api/tickets/" + t1 + "/assignee"), agentB.token(), "{\"agentId\":" + agentB.id() + "}")
                .andExpect(status().isForbidden());
        send(put("/api/tickets/" + t2 + "/assignee"), agentB.token(), "{\"agentId\":" + agentA.id() + "}")
                .andExpect(status().isForbidden());
        send(patch("/api/tickets/" + t2 + "/status"), agentB.token(), "{\"status\":\"PENDING\"}")
                .andExpect(status().isForbidden());
        send(post("/api/tickets/" + t2 + "/messages"), agentB.token(), "{\"body\":\"Before claiming\"}")
                .andExpect(status().isForbidden());

        send(put("/api/tickets/" + t2 + "/assignee"), agentB.token(), "{\"agentId\":" + agentB.id() + "}")
                .andExpect(status().isOk());
        send(patch("/api/tickets/" + t2 + "/status"), agentB.token(), "{\"status\":\"PENDING\"}")
                .andExpect(status().isOk());
        send(post("/api/tickets/" + t2 + "/messages"), agentB.token(), "{\"body\":\"On it\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.agentId").value(agentB.id()));
        send(patch("/api/tickets/" + t2 + "/status"), agentA.token(), "{\"status\":\"SOLVED\"}")
                .andExpect(status().isForbidden());

        fetch("/api/tickets?requesterEmail=two-rbac@example.com", customer1)
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.id == " + t3 + ")]").doesNotExist());
        fetch("/api/tickets/" + t1, customer2).andExpect(status().isNotFound());
        fetch("/api/tickets/" + t1 + "/messages", customer2).andExpect(status().isNotFound());
        send(post("/api/tickets/" + t1 + "/messages"), customer2, "{\"body\":\"hi\"}")
                .andExpect(status().isNotFound());
    }

    @Test
    void validationAndNotFound() throws Exception {
        String customer = registerCustomer("Val", "val@example.com");
        String admin = adminToken();

        send(post("/api/tickets"), customer, "{\"subject\":\"\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.subject").exists())
                .andExpect(jsonPath("$.fieldErrors.description").exists());
        fetch("/api/tickets/999999", customer).andExpect(status().isNotFound());

        long id = createTicket(customer);
        send(put("/api/tickets/" + id + "/assignee"), admin, "{\"agentId\":999999}")
                .andExpect(status().isNotFound());
        send(post("/api/tickets/" + id + "/messages"), admin, "{\"body\":\"\"}")
                .andExpect(status().isBadRequest());
        send(post("/api/agents"), admin, "{\"name\":\"NoPass\",\"email\":\"nopass@test.local\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }
}

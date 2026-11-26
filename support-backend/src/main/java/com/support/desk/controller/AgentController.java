package com.support.desk.controller;

import com.support.desk.dto.AgentResponse;
import com.support.desk.dto.CreateAgentRequest;
import com.support.desk.security.AuthUser;
import com.support.desk.service.AgentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentService service;

    public AgentController(AgentService service) {
        this.service = service;
    }

    @GetMapping
    public List<AgentResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public AgentResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AgentResponse create(@Valid @RequestBody CreateAgentRequest req,
                                @AuthenticationPrincipal AuthUser user) {
        return service.create(req, user);
    }
}

package com.support.desk.config;

import com.support.desk.model.Agent;
import com.support.desk.model.AgentRole;
import com.support.desk.repository.AgentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.seed-agents", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final AgentRepository agents;
    private final PasswordEncoder passwordEncoder;
    private final String seedPassword;

    public DataSeeder(AgentRepository agents, PasswordEncoder passwordEncoder,
                      @Value("${app.seed-password}") String seedPassword) {
        this.agents = agents;
        this.passwordEncoder = passwordEncoder;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(String... args) {
        if (agents.count() == 0) {
            agents.save(new Agent("Alice Johnson", "alice@support.local"));
            agents.save(new Agent("Bob Smith", "bob@support.local"));
            agents.save(new Agent("Carol Lee", "carol@support.local"));
        }
        if (!agents.existsByRole(AgentRole.ADMIN) && !agents.existsByEmailIgnoreCase("admin@support.local")) {
            agents.save(new Agent("Admin", "admin@support.local", AgentRole.ADMIN));
        }
        for (Agent agent : agents.findByPasswordHashIsNull()) {
            agent.setPasswordHash(passwordEncoder.encode(seedPassword));
            agents.save(agent);
        }
    }
}

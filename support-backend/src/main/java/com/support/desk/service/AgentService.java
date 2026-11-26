package com.support.desk.service;

import com.support.desk.dto.AgentResponse;
import com.support.desk.dto.CreateAgentRequest;
import com.support.desk.exception.ApiException;
import com.support.desk.model.Agent;
import com.support.desk.model.AgentRole;
import com.support.desk.repository.AgentRepository;
import com.support.desk.security.AuthUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AgentService {

    private final AgentRepository agents;
    private final PasswordEncoder passwordEncoder;

    public AgentService(AgentRepository agents, PasswordEncoder passwordEncoder) {
        this.agents = agents;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AgentResponse> list() {
        return agents.findAll().stream().map(AgentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AgentResponse get(Long id) {
        return AgentResponse.from(load(id));
    }

    @Transactional
    public AgentResponse create(CreateAgentRequest req, AuthUser actor) {
        if (!actor.isStaff() || !load(actor.id()).isAdmin()) {
            throw ApiException.forbidden("Only admins can create agents");
        }
        String email = req.email().trim();
        if (agents.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("Agent with email " + email + " already exists");
        }
        AgentRole role = req.role() == null ? AgentRole.AGENT : req.role();
        Agent agent = new Agent(req.name().trim(), email, role);
        agent.setPasswordHash(passwordEncoder.encode(req.password()));
        return AgentResponse.from(agents.save(agent));
    }

    /** Internal lookup for other modules; returns the managed entity. */
    @Transactional(readOnly = true)
    public Agent load(Long id) {
        return agents.findById(id).orElseThrow(() -> ApiException.notFound("Agent " + id + " not found"));
    }
}

package com.support.desk.dto;

import com.support.desk.model.Agent;
import com.support.desk.model.AgentRole;

import java.time.Instant;

public record AgentResponse(Long id, String name, String email, AgentRole role, Instant createdAt) {

    public static AgentResponse from(Agent a) {
        return a == null ? null
                : new AgentResponse(a.getId(), a.getName(), a.getEmail(), a.getRole(), a.getCreatedAt());
    }
}

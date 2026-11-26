package com.support.desk.dto;

/** agentId == null unassigns the ticket. */
public record AssignTicketRequest(Long agentId) {
}

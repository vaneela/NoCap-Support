package com.support.desk.dto;

import com.support.desk.model.AuthorType;
import com.support.desk.model.Message;

import java.time.Instant;

public record MessageResponse(Long id, Long ticketId, AuthorType authorType, String authorName,
                              Long agentId, String body, Instant createdAt) {

    public static MessageResponse from(Message m) {
        return new MessageResponse(m.getId(), m.getTicket().getId(), m.getAuthorType(), m.getAuthorName(),
                m.getAgent() == null ? null : m.getAgent().getId(), m.getBody(), m.getCreatedAt());
    }
}

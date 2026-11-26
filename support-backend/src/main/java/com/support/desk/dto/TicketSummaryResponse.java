package com.support.desk.dto;

import com.support.desk.model.Ticket;
import com.support.desk.model.TicketStatus;

import java.time.Instant;

public record TicketSummaryResponse(Long id, String subject, String requesterName, String requesterEmail,
                                    TicketStatus status, AgentResponse assignee,
                                    Instant createdAt, Instant updatedAt) {

    public static TicketSummaryResponse from(Ticket t) {
        return new TicketSummaryResponse(t.getId(), t.getSubject(), t.getRequesterName(), t.getRequesterEmail(),
                t.getStatus(), AgentResponse.from(t.getAssignee()), t.getCreatedAt(), t.getUpdatedAt());
    }
}

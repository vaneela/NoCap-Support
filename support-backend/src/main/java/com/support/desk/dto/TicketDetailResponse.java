package com.support.desk.dto;

import com.support.desk.model.Ticket;
import com.support.desk.model.TicketStatus;
import com.support.desk.model.Message;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record TicketDetailResponse(Long id, String subject, String description, String requesterName,
                                   String requesterEmail, TicketStatus status,
                                   Set<TicketStatus> allowedTransitions,
                                   AgentResponse assignee, Instant createdAt, Instant updatedAt,
                                   List<MessageResponse> messages) {

    public static TicketDetailResponse from(Ticket t, List<Message> messages) {
        return new TicketDetailResponse(t.getId(), t.getSubject(), t.getDescription(), t.getRequesterName(),
                t.getRequesterEmail(), t.getStatus(), t.getStatus().allowedTransitions(),
                AgentResponse.from(t.getAssignee()), t.getCreatedAt(), t.getUpdatedAt(),
                messages.stream().map(MessageResponse::from).toList());
    }
}

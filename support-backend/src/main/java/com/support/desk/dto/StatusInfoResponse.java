package com.support.desk.dto;

import com.support.desk.model.TicketStatus;

import java.util.Set;

public record StatusInfoResponse(TicketStatus status, Set<TicketStatus> allowedTransitions) {
}

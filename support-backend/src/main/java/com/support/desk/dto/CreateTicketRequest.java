package com.support.desk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Requester identity comes from the authenticated customer, never from the request body. */
public record CreateTicketRequest(
        @NotBlank @Size(max = 300) String subject,
        @NotBlank @Size(max = 10000) String description) {
}

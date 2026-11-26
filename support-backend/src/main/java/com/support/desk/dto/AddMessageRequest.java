package com.support.desk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Author (customer or agent) is derived from the authenticated user. */
public record AddMessageRequest(@NotBlank @Size(max = 10000) String body) {
}

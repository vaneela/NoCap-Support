package com.support.desk.dto;

import com.support.desk.security.AuthUser;

import java.time.Instant;

public record AuthResponse(String token, Instant expiresAt, AuthUser user) {
}

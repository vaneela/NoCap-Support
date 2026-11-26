package com.support.desk.controller;

import com.support.desk.dto.AuthResponse;
import com.support.desk.dto.LoginRequest;
import com.support.desk.dto.RegisterRequest;
import com.support.desk.security.AuthUser;
import com.support.desk.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return service.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req);
    }

    @PostMapping("/staff/login")
    public AuthResponse staffLogin(@Valid @RequestBody LoginRequest req) {
        return service.staffLogin(req);
    }

    @GetMapping("/me")
    public AuthUser me(@AuthenticationPrincipal AuthUser user) {
        return service.me(user);
    }
}

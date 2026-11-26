package com.support.desk.service;

import com.support.desk.dto.AuthResponse;
import com.support.desk.dto.LoginRequest;
import com.support.desk.dto.RegisterRequest;
import com.support.desk.exception.ApiException;
import com.support.desk.model.Customer;
import com.support.desk.repository.AgentRepository;
import com.support.desk.repository.CustomerRepository;
import com.support.desk.security.AuthUser;
import com.support.desk.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final CustomerRepository customers;
    private final AgentRepository agents;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String dummyHash;

    public AuthService(CustomerRepository customers, AgentRepository agents, PasswordEncoder encoder, JwtService jwt) {
        this.customers = customers;
        this.agents = agents;
        this.encoder = encoder;
        this.jwt = jwt;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (customers.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }
        Customer customer = customers.save(new Customer(req.name().trim(), email, encoder.encode(req.password())));
        return jwt.issue(AuthUser.of(customer));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        return customers.findByEmailIgnoreCase(normalize(req.email()))
                .filter(c -> matches(req.password(), c.getPasswordHash()))
                .map(c -> jwt.issue(AuthUser.of(c)))
                .orElseThrow(this::invalid);
    }

    @Transactional(readOnly = true)
    public AuthResponse staffLogin(LoginRequest req) {
        return agents.findByEmailIgnoreCase(normalize(req.email()))
                .filter(a -> matches(req.password(), a.getPasswordHash()))
                .map(a -> jwt.issue(AuthUser.of(a)))
                .orElseThrow(this::invalid);
    }

    @Transactional(readOnly = true)
    public AuthUser me(AuthUser user) {
        return (user.isCustomer()
                ? customers.findById(user.id()).map(AuthUser::of)
                : agents.findById(user.id()).map(AuthUser::of))
                .orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }

    private boolean matches(String raw, String hash) {
        if (hash == null) {
            encoder.matches(raw, dummyHash);
            return false;
        }
        return encoder.matches(raw, hash);
    }

    private ApiException invalid() {
        encoder.matches("", dummyHash);
        return ApiException.unauthorized(INVALID_CREDENTIALS);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

package com.support.desk.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "agents")
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    private AgentRole role;

    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Agent() {
    }

    public Agent(String name, String email) {
        this(name, email, AgentRole.AGENT);
    }

    public Agent(String name, String email, AgentRole role) {
        this.name = name;
        this.email = email;
        this.role = role;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public AgentRole getRole() { return role == null ? AgentRole.AGENT : role; }
    public boolean isAdmin() { return getRole() == AgentRole.ADMIN; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Instant getCreatedAt() { return createdAt; }
}

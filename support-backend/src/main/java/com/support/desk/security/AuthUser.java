package com.support.desk.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.support.desk.model.Agent;
import com.support.desk.model.Customer;

/** Authenticated principal resolved from the JWT. role is CUSTOMER, AGENT or ADMIN. */
public record AuthUser(UserType type, Long id, String name, String email, String role) {

    public enum UserType { CUSTOMER, STAFF }

    public static AuthUser of(Customer c) {
        return new AuthUser(UserType.CUSTOMER, c.getId(), c.getName(), c.getEmail(), "CUSTOMER");
    }

    public static AuthUser of(Agent a) {
        return new AuthUser(UserType.STAFF, a.getId(), a.getName(), a.getEmail(), a.getRole().name());
    }

    @JsonIgnore
    public boolean isCustomer() {
        return type == UserType.CUSTOMER;
    }

    @JsonIgnore
    public boolean isStaff() {
        return type == UserType.STAFF;
    }
}

package com.support.desk.repository;

import com.support.desk.model.Agent;
import com.support.desk.model.AgentRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentRepository extends JpaRepository<Agent, Long> {
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(AgentRole role);

    Optional<Agent> findByEmailIgnoreCase(String email);

    List<Agent> findByPasswordHashIsNull();
}

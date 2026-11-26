package com.support.desk.service;

import com.support.desk.exception.ApiException;
import com.support.desk.model.Agent;
import com.support.desk.model.Ticket;
import com.support.desk.security.AuthUser;
import org.springframework.stereotype.Component;

/**
 * CUSTOMER: only tickets raised with their account email (others look like 404).
 * ADMIN: sees and assigns everything, but only the assignee may reply. AGENT: sees own + unassigned tickets, may only claim/release for themselves,
 * and must be the assignee to reply or change status.
 */
@Component
public class TicketAccessPolicy {

    public void ensureCustomerOwns(AuthUser customer, Ticket ticket) {
        if (!ticket.getRequesterEmail().equalsIgnoreCase(customer.email())) {
            throw ApiException.notFound("Ticket " + ticket.getId() + " not found");
        }
    }

    public Long visibilityScope(Agent actor) {
        return actor.isAdmin() ? null : actor.getId();
    }

    public void ensureCanView(Agent actor, Ticket ticket) {
        if (actor.isAdmin()) {
            return;
        }
        Agent assignee = ticket.getAssignee();
        if (assignee != null && !assignee.getId().equals(actor.getId())) {
            throw ApiException.forbidden("Ticket " + ticket.getId() + " is assigned to another agent");
        }
    }

    public void ensureCanWork(Agent actor, Ticket ticket) {
        if (actor.isAdmin()) {
            return;
        }
        Agent assignee = ticket.getAssignee();
        if (assignee == null || !assignee.getId().equals(actor.getId())) {
            throw ApiException.forbidden("Assign ticket " + ticket.getId() + " to yourself before working on it");
        }
    }

    public void ensureCanReply(Agent actor, Ticket ticket) {
        Agent assignee = ticket.getAssignee();
        if (assignee == null || !assignee.getId().equals(actor.getId())) {
            throw ApiException.forbidden("Only the assignee can reply on ticket " + ticket.getId());
        }
    }

    public void ensureCanAssign(Agent actor, Ticket ticket, Long targetAgentId) {
        if (actor.isAdmin()) {
            return;
        }
        ensureCanView(actor, ticket);
        if (targetAgentId != null && !targetAgentId.equals(actor.getId())) {
            throw ApiException.forbidden("Agents can only assign tickets to themselves");
        }
    }
}

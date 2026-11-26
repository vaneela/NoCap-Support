package com.support.desk.service;

import com.support.desk.model.Agent;
import com.support.desk.model.Customer;
import com.support.desk.model.Ticket;
import com.support.desk.model.TicketStatus;
import com.support.desk.exception.ApiException;
import com.support.desk.dto.AddMessageRequest;
import com.support.desk.dto.CreateTicketRequest;
import com.support.desk.dto.MessageResponse;
import com.support.desk.dto.TicketDetailResponse;
import com.support.desk.dto.TicketSummaryResponse;
import com.support.desk.model.AuthorType;
import com.support.desk.model.Message;
import com.support.desk.repository.CustomerRepository;
import com.support.desk.repository.MessageRepository;
import com.support.desk.repository.TicketRepository;
import com.support.desk.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
public class TicketService {

    private static final String SYSTEM_AUTHOR = "System";

    private final TicketRepository tickets;
    private final MessageRepository messages;
    private final CustomerRepository customers;
    private final AgentService agentService;
    private final TicketAccessPolicy access;

    public TicketService(TicketRepository tickets, MessageRepository messages, CustomerRepository customers,
                         AgentService agentService, TicketAccessPolicy access) {
        this.tickets = tickets;
        this.messages = messages;
        this.customers = customers;
        this.agentService = agentService;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<TicketSummaryResponse> search(TicketStatus status, Long assigneeId, boolean unassigned, String q,
                                              String requesterEmail, AuthUser user) {
        String query = blankToNull(q);
        String email;
        Long visibleTo;
        if (user.isCustomer()) {
            email = user.email();
            visibleTo = null;
        } else {
            email = blankToNull(requesterEmail);
            visibleTo = access.visibilityScope(staff(user));
        }
        return tickets.search(status, assigneeId, unassigned, query, email, visibleTo).stream()
                .map(TicketSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketDetailResponse get(Long id, AuthUser user) {
        Ticket ticket = load(id);
        ensureCanView(user, ticket);
        return detail(ticket);
    }

    @Transactional
    public TicketDetailResponse create(CreateTicketRequest req, AuthUser user) {
        if (!user.isCustomer()) {
            throw ApiException.forbidden("Only customers can create tickets");
        }
        Customer customer = customers.findById(user.id())
                .orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
        Ticket ticket = tickets.save(new Ticket(req.subject().trim(), req.description().trim(),
                customer.getName(), customer.getEmail()));
        messages.save(new Message(ticket, AuthorType.REQUESTER, ticket.getRequesterName(), null,
                ticket.getDescription()));
        return detail(ticket);
    }

    @Transactional
    public TicketDetailResponse assign(Long ticketId, Long agentId, AuthUser user) {
        Ticket ticket = load(ticketId);
        access.ensureCanAssign(staff(user), ticket, agentId);
        ensureNotClosed(ticket);
        Agent current = ticket.getAssignee();
        Agent next = agentId == null ? null : agentService.load(agentId);
        Long currentId = current == null ? null : current.getId();
        Long nextId = next == null ? null : next.getId();
        if (Objects.equals(currentId, nextId)) {
            return detail(ticket);
        }
        ticket.setAssignee(next);
        ticket.touch();
        if (next == null) {
            systemMessage(ticket, "Unassigned from " + current.getName());
        } else if (current == null) {
            systemMessage(ticket, "Assigned to " + next.getName());
        } else {
            systemMessage(ticket, "Reassigned from " + current.getName() + " to " + next.getName());
        }
        return detail(ticket);
    }

    @Transactional
    public TicketDetailResponse changeStatus(Long ticketId, TicketStatus target, AuthUser user) {
        Ticket ticket = load(ticketId);
        Agent actor = staff(user);
        access.ensureCanWork(actor, ticket);
        TicketStatus from = ticket.getStatus();
        if (from == target) {
            return detail(ticket);
        }
        if (!from.canTransitionTo(target)) {
            throw ApiException.conflict("Cannot change status from " + from + " to " + target
                    + ". Allowed: " + from.allowedTransitions());
        }
        ticket.setStatus(target);
        ticket.touch();
        systemMessage(ticket, "Status changed from " + from + " to " + target + " by " + actor.getName());
        return detail(ticket);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> listMessages(Long ticketId, AuthUser user) {
        ensureCanView(user, load(ticketId));
        return messages.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId).stream()
                .map(MessageResponse::from)
                .toList();
    }

    @Transactional
    public MessageResponse addMessage(Long ticketId, AddMessageRequest req, AuthUser user) {
        Ticket ticket = load(ticketId);
        Message message;
        if (user.isCustomer()) {
            access.ensureCustomerOwns(user, ticket);
            ensureNotClosed(ticket);
            message = new Message(ticket, AuthorType.REQUESTER, ticket.getRequesterName(), null, req.body().trim());
        } else {
            Agent agent = staff(user);
            access.ensureCanReply(agent, ticket);
            ensureNotClosed(ticket);
            message = new Message(ticket, AuthorType.AGENT, agent.getName(), agent, req.body().trim());
        }
        message = messages.save(message);
        ticket.touch();

        if (user.isCustomer()
                && (ticket.getStatus() == TicketStatus.PENDING || ticket.getStatus() == TicketStatus.SOLVED)) {
            TicketStatus from = ticket.getStatus();
            ticket.setStatus(TicketStatus.OPEN);
            systemMessage(ticket, "Status changed from " + from + " to OPEN (requester replied)");
        }
        return MessageResponse.from(message);
    }

    private void systemMessage(Ticket ticket, String text) {
        messages.save(new Message(ticket, AuthorType.SYSTEM, SYSTEM_AUTHOR, null, text));
    }

    private void ensureNotClosed(Ticket ticket) {
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw ApiException.conflict("Ticket " + ticket.getId() + " is closed");
        }
    }

    private TicketDetailResponse detail(Ticket ticket) {
        return TicketDetailResponse.from(ticket,
                messages.findByTicketIdOrderByCreatedAtAscIdAsc(ticket.getId()));
    }

    private void ensureCanView(AuthUser user, Ticket ticket) {
        if (user.isCustomer()) {
            access.ensureCustomerOwns(user, ticket);
        } else {
            access.ensureCanView(staff(user), ticket);
        }
    }

    private Agent staff(AuthUser user) {
        if (!user.isStaff()) {
            throw ApiException.forbidden("Staff only");
        }
        return agentService.load(user.id());
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private Ticket load(Long id) {
        return tickets.findById(id).orElseThrow(() -> ApiException.notFound("Ticket " + id + " not found"));
    }
}

package com.support.desk.controller;

import com.support.desk.dto.AddMessageRequest;
import com.support.desk.dto.AssignTicketRequest;
import com.support.desk.dto.CreateTicketRequest;
import com.support.desk.dto.MessageResponse;
import com.support.desk.dto.TicketDetailResponse;
import com.support.desk.dto.TicketSummaryResponse;
import com.support.desk.dto.UpdateStatusRequest;
import com.support.desk.model.TicketStatus;
import com.support.desk.security.AuthUser;
import com.support.desk.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    @GetMapping
    public List<TicketSummaryResponse> list(@RequestParam(required = false) TicketStatus status,
                                            @RequestParam(required = false) Long assigneeId,
                                            @RequestParam(defaultValue = "false") boolean unassigned,
                                            @RequestParam(required = false) String q,
                                            @RequestParam(required = false) String requesterEmail,
                                            @AuthenticationPrincipal AuthUser user) {
        return service.search(status, assigneeId, unassigned, q, requesterEmail, user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDetailResponse create(@Valid @RequestBody CreateTicketRequest req,
                                       @AuthenticationPrincipal AuthUser user) {
        return service.create(req, user);
    }

    @GetMapping("/{id}")
    public TicketDetailResponse get(@PathVariable Long id, @AuthenticationPrincipal AuthUser user) {
        return service.get(id, user);
    }

    @PutMapping("/{id}/assignee")
    public TicketDetailResponse assign(@PathVariable Long id, @RequestBody AssignTicketRequest req,
                                       @AuthenticationPrincipal AuthUser user) {
        return service.assign(id, req.agentId(), user);
    }

    @PatchMapping("/{id}/status")
    public TicketDetailResponse changeStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest req,
                                             @AuthenticationPrincipal AuthUser user) {
        return service.changeStatus(id, req.status(), user);
    }

    @GetMapping("/{id}/messages")
    public List<MessageResponse> messages(@PathVariable Long id, @AuthenticationPrincipal AuthUser user) {
        return service.listMessages(id, user);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse addMessage(@PathVariable Long id, @Valid @RequestBody AddMessageRequest req,
                                      @AuthenticationPrincipal AuthUser user) {
        return service.addMessage(id, req, user);
    }
}

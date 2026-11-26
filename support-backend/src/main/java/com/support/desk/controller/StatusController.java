package com.support.desk.controller;

import com.support.desk.dto.StatusInfoResponse;
import com.support.desk.model.TicketStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/statuses")
public class StatusController {

    @GetMapping
    public List<StatusInfoResponse> statuses() {
        return Arrays.stream(TicketStatus.values())
                .map(s -> new StatusInfoResponse(s, s.allowedTransitions()))
                .toList();
    }
}

package com.support.desk.repository;

import com.support.desk.model.Ticket;
import com.support.desk.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    @Query("""
            select t from Ticket t left join t.assignee a
            where (:status is null or t.status = :status)
              and (:assigneeId is null or a.id = :assigneeId)
              and (:unassigned = false or a is null)
              and (:q is null or lower(t.subject) like lower(concat('%', :q, '%'))
                              or lower(t.requesterEmail) like lower(concat('%', :q, '%')))
              and (:requesterEmail is null or lower(t.requesterEmail) = lower(:requesterEmail))
              and (:visibleTo is null or a is null or a.id = :visibleTo)
            order by t.updatedAt desc, t.id desc
            """)
    List<Ticket> search(@Param("status") TicketStatus status,
                        @Param("assigneeId") Long assigneeId,
                        @Param("unassigned") boolean unassigned,
                        @Param("q") String q,
                        @Param("requesterEmail") String requesterEmail,
                        @Param("visibleTo") Long visibleTo);
}

# NoCap Support Backend — Architecture

Spring Boot 3.3.5 · Java 21 · Spring Data JPA · SQLite · Spring Security (JWT).

![Architecture diagram](docs/architecture.svg)

## System Overview

```mermaid
%%{init: {'theme':'dark'}}%%
flowchart LR
    subgraph Client["Browser"]
        CU[Customer UI :5173/5174]
        ST[Staff UI :5173/5174]
    end

    subgraph Vite["Vite Dev Server"]
        PXY["/api proxy → :8081"]
    end

    subgraph Backend["Spring Boot :8081"]
        subgraph Filter["Security Filter Chain (stateless)"]
            CORS[CORS check<br/>WebConfig]
            JWT[BearerTokenAuthFilter<br/>validates HS256 JWT]
            AUTHZ[URL role rules<br/>SecurityConfig]
            ERR[JsonSecurityErrorHandler<br/>401/403 as JSON]
        end

        subgraph Controllers
            AC[AuthController]
            TC[TicketController]
            GC[AgentController]
            SC[StatusController]
        end

        subgraph Services
            AS[AuthService]
            TS[TicketService]
            GS[AgentService]
            TP[TicketAccessPolicy<br/>RBAC + ownership]
            JS2[JwtService<br/>issue tokens]
        end

        subgraph Repos["Spring Data JPA"]
            TR[TicketRepository]
            MR[MessageRepository]
            AR[AgentRepository]
            CR[CustomerRepository]
        end

        DS[DataSeeder<br/>seeds staff + dev passwords]
    end

    DB[(SQLite<br/>support.db)]

    CU --> PXY
    ST --> PXY
    PXY --> CORS --> JWT --> AUTHZ --> Controllers
    JWT -.invalid.-> ERR
    AUTHZ -.forbidden.-> ERR

    AC --> AS
    TC --> TS
    GC --> GS
    AS --> JS2
    AS --> CR
    AS --> AR
    TS --> TP
    TS --> TR
    TS --> MR
    TS --> GS
    GS --> AR
    DS --> AR
    TR --> DB
    MR --> DB
    AR --> DB
    CR --> DB

    classDef client fill:#082f3f,stroke:#22E8FF,color:#f0fdff
    classDef edge fill:#2e1065,stroke:#818cf8,color:#ede9fe
    classDef sec fill:#500724,stroke:#F91FC6,color:#fdf2f8
    classDef ctl fill:#451a03,stroke:#fbbf24,color:#fffbeb
    classDef svc fill:#1e1b4b,stroke:#a78bfa,color:#eef2ff
    classDef repo fill:#1a2e05,stroke:#a3e635,color:#f7fee7
    classDef db fill:#160a2b,stroke:#F91FC6,color:#fdf2f8

    class CU,ST client
    class PXY edge
    class CORS,JWT,AUTHZ,ERR sec
    class AC,TC,GC,SC ctl
    class AS,TS,GS,TP,JS2 svc
    class TR,MR,AR,CR repo
    class DB db
    class DS edge
```

## Database (ERD)

```mermaid
%%{init: {'theme':'dark'}}%%
erDiagram
    CUSTOMER ||--o{ TICKET : "raises (requester_email)"
    AGENT ||--o{ TICKET : "is assignee of"
    TICKET ||--|{ MESSAGE : "has"
    AGENT ||--o{ MESSAGE : "authors (agent_id)"

    CUSTOMER {
        long id PK
        string name
        string email UK
        string password_hash
        instant created_at
    }

    AGENT {
        long id PK
        string name
        string email UK
        string password_hash "nullable (legacy rows)"
        enum role "ADMIN | AGENT"
        instant created_at
    }

    TICKET {
        long id PK
        string subject
        string description
        string requester_name
        string requester_email
        enum status "OPEN → PENDING → SOLVED → CLOSED"
        long assignee_id FK "nullable → AGENT.id"
        instant created_at
        instant updated_at
    }

    MESSAGE {
        long id PK
        long ticket_id FK
        enum author_type "REQUESTER | AGENT | SYSTEM"
        string author_name "denormalized"
        long agent_id FK "nullable"
        text body
        instant created_at
    }
```

## Layered Design (MVC)

```mermaid
%%{init: {'theme':'dark'}}%%
flowchart TB
    subgraph dto["dto — request/response records (API contract, never entities)"]
        REQ[RegisterRequest · LoginRequest<br/>CreateTicketRequest · AddMessageRequest<br/>UpdateStatusRequest · AssignTicketRequest<br/>CreateAgentRequest]
        RES[AuthResponse · TicketSummaryResponse<br/>TicketDetailResponse · MessageResponse<br/>AgentResponse · StatusInfoResponse]
    end

    subgraph controller["controller — HTTP edge only"]
        C1[AuthController · TicketController<br/>AgentController · StatusController]
    end

    subgraph service["service — business rules"]
        S1[AuthService · TicketService · AgentService]
        S2[TicketAccessPolicy — all RBAC/ownership checks]
    end

    subgraph repo["repository — persistence"]
        R1[JPA repositories ×4]
    end

    subgraph model["model — JPA entities + enums"]
        M1[Ticket · Message · Agent · Customer<br/>TicketStatus · AgentRole · AuthorType]
    end

    controller -->|validates @Valid DTOs| service
    service --> repo --> model
    model --> RES
```

## Request Lifecycle (authenticated call)

```mermaid
%%{init: {'theme':'dark'}}%%
sequenceDiagram
    participant B as Browser
    participant F as SecurityFilterChain
    participant C as TicketController
    participant S as TicketService
    participant P as TicketAccessPolicy
    participant R as Repositories
    participant D as SQLite

    B->>F: GET /api/tickets + Bearer JWT
    F->>F: CORS origin match?
    F->>F: Verify HS256 signature + expiry → AuthUser in SecurityContext
    alt invalid/missing token
        F-->>B: 401 JSON
    end
    F->>C: AuthUser principal
    C->>S: search(..., AuthUser)
    S->>P: visibilityScope(actor) — null for admin, id for agent, email for customer
    S->>R: filtered query
    R->>D: SQL
    R-->>S: entities
    S-->>C: DTO responses
    C-->>B: 200 JSON
```

## Design Decisions

### Security

- **Stateless JWT (HS256)** — no sessions; every request carries identity. The `AuthUser` principal (type, id, name, email, role) is reconstructed from claims, so the DB isn't hit on every request for identity.
- **Actor from token, never from body** — request DTOs carry no identity fields. This eliminates spoofing (the old `X-Agent-Id` header trusted the client).
- **Two login surfaces, one token format** — `/auth/login` (customers) and `/auth/staff/login` (agents/admins). Same JWT shape; the `type` claim keeps a staff email from ever being used as a customer session.
- **`TicketAccessPolicy` is a separate class** — every cross-user rule in one place: customers see only their own tickets (other people's tickets return 404, not 403, so existence isn't leaked), agents see own + unassigned and can only claim/release for themselves, **only the assignee can reply** (admins included), admins assign to anyone.
- **BCrypt** password hashing; `JsonSecurityErrorHandler` returns consistent JSON 401/403 instead of HTML.

### Data

- **SQLite** — zero-install, file-based (`support.db`, overridable via `SUPPORT_DB_PATH`). Swap to Postgres by changing only datasource + dialect; repositories are pure Spring Data interfaces.
- **`requester_email` on Ticket instead of a FK to Customer** — tickets survive customer deletion; the customer's identity at ticket-creation is snapshotted (`requester_name` too). Ownership compares against the *token's* email, not a mutable join.
- **`author_name` denormalized on Message** — chat history displays the name the author had at write time; no join needed for the most common query (full thread ordered by `created_at, id`).
- **`SYSTEM` author type** — assignment/status events are written as messages, giving an audit trail inside the same timeline the user reads.
- **`allowedTransitions` computed in `TicketDetailResponse`** — the frontend renders buttons from what the server permits, so the status state machine (`OPEN→PENDING→SOLVED→CLOSED`, reopen allowed) lives only on the backend.

### Config

- **CORS via `allowedOriginPatterns`** with `http://localhost:[*],http://127.0.0.1:[*]` — arbitrary local dev ports allowed, every other origin rejected, overridable via `CORS_ORIGINS`.
- **Seeding via `DataSeeder`** — seeds 3 agents + 1 admin, and backfills `SEED_PASSWORD` onto legacy staff rows lacking `password_hash` (nullable field chosen deliberately so the schema migrates itself with `ddl-auto=update`).
- **Secrets externalized** — `JWT_SECRET` (≥32 bytes), `JWT_TTL`, `SEED_PASSWORD` all have dev defaults only; production must override.

### Error model

- **`ApiException` + `GlobalExceptionHandler`** — services throw semantic errors (`notFound`, `forbidden`, `conflict`, `badRequest`); controllers stay thin. Validation errors return a `fieldErrors` map for form UIs.

### Testing

- `TicketFlowIntegrationTest` — end-to-end flows over MockMvc covering auth, RBAC boundaries, customer ownership, and the full ticket lifecycle against a temp SQLite DB.

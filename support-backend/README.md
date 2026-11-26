# NoCap Support: Backend (Spring Boot + SQLite)

Architecture diagrams (system overview, ERD, request lifecycle) and design decisions: [ARCHITECTURE.md](ARCHITECTURE.md)

## Run
```
mvn spring-boot:run          # http://localhost:8081, creates ./support.db
mvn test                     # end-to-end integration tests (temp SQLite file)
```
Env overrides: `SUPPORT_DB_PATH` (SQLite file path), `CORS_ORIGINS` (comma-separated origins/patterns, default `http://localhost:[*],http://127.0.0.1:[*]`),
`JWT_SECRET` (HS256 key, >= 32 bytes; **must be set outside local dev**), `JWT_TTL` (default `PT8H`),
`SEED_PASSWORD` (default `changeme123`).

Three agents (`alice@`, `bob@`, `carol@support.local`) and one admin (`admin@support.local`) are seeded on first start.
Any staff account without a password (seeded or pre-auth rows) gets `SEED_PASSWORD` at startup. Dev only: change these.

## Status lifecycle
`OPEN -> PENDING -> SOLVED -> CLOSED`

| From    | Allowed to       |
|---------|------------------|
| OPEN    | PENDING, SOLVED  |
| PENDING | OPEN, SOLVED     |
| SOLVED  | OPEN, CLOSED     |
| CLOSED  | (terminal)       |

- OPEN: needs agent action. PENDING: waiting on requester. SOLVED: resolved but can be reopened. CLOSED: read-only.
- A requester reply on a PENDING/SOLVED ticket automatically reopens it (OPEN).
- Status changes and (re)assignments are appended to the thread as `SYSTEM` messages so they are visible in the UI.
- Closed tickets reject new messages and assignment (409).

## Authentication
Spring Security, stateless JWT (HS256) sent as `Authorization: Bearer <token>`. Passwords are BCrypt-hashed.
Customers self-register; staff accounts are created by admins. The acting user is always taken from the token,
never from the request body.

| Role | Sees | Assign | Reply / change status |
|---|---|---|---|
| CUSTOMER | only tickets raised with their account email (others return 404) | no | reply on own tickets |
| ADMIN | all tickets | to anyone | change status on any ticket; reply only if they are the assignee |
| AGENT | own + unassigned | only to self (claim) / release own | only tickets assigned to them |

No/invalid/expired token returns 401; role violations return 403. `/agents` is staff-only.

## API (base `/api`)
| Method | Path | Body | Auth | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | public | 201, customer account; returns `{token, expiresAt, user}` |
| POST | `/auth/login` | `{email, password}` | public | customer login |
| POST | `/auth/staff/login` | `{email, password}` | public | agent/admin login |
| GET | `/auth/me` | | any | current user `{type, id, name, email, role}` |
| GET | `/agents` | | staff | list agents |
| POST | `/agents` | `{name, email, password, role?: ADMIN\|AGENT}` | admin | 201 |
| GET | `/agents/{id}` | | staff | |
| GET | `/tickets?status=&assigneeId=&unassigned=&q=&requesterEmail=` | | any | newest activity first; scoped by role |
| POST | `/tickets` | `{subject, description}` | customer | 201, requester = caller; description becomes first message |
| GET | `/tickets/{id}` | | any | detail incl. `allowedTransitions` and `messages` |
| PUT | `/tickets/{id}/assignee` | `{agentId}` (`null` = unassign) | staff | assign / reassign |
| PATCH | `/tickets/{id}/status` | `{status}` | staff | 409 on invalid transition |
| GET | `/tickets/{id}/messages` | | any | thread in chronological order |
| POST | `/tickets/{id}/messages` | `{body}` | any | 201, author = caller |
| GET | `/statuses` | | any | statuses with allowed transitions |

Errors: `{timestamp, status, error, message, fieldErrors?}` with 400 / 401 / 403 / 404 / 409.

## Frontend
See `../support-frontend` (React + Vite); its dev server proxies `/api` to this backend.

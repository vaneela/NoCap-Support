# NoCap Support: Frontend (React + Vite + Tailwind)

UI for `../support-backend`.

## Run
```
# terminal 1
cd ../support-backend && mvn spring-boot:run     # http://localhost:8081

# terminal 2
npm install
npm run dev                                       # http://localhost:5173
```
The dev server proxies `/api` to `http://localhost:8081` (override with `VITE_API_PROXY_TARGET`).
`npm run build` type-checks and outputs `dist/`.

## Views
- **Customer** (`/`): sign in or create an account, then `/customer` to create tickets and chat with support. Only the customer's own tickets are visible.
- **Staff** (`/staff/login`, not linked from the customer page): sign in with a staff account (seeded dev password `changeme123`).
  - **Admin**: dashboard with status counts, agent workload and a filterable table of all tickets with inline assignment. Opening a ticket shows the conversation read-only (only the assignee can chat). Manages the team and sets initial passwords (Team button).
  - **Agent**: sees own + unassigned tickets, can assign to self / release, and replies or changes status only on tickets assigned to them.

Chat threads poll every 4s, ticket lists every 8s.

## Auth
The JWT from the login endpoints is stored in `localStorage` and sent as `Authorization: Bearer`. On load the token is re-validated via `/api/auth/me`;
any 401 or token expiry signs the user out. Customer and staff routes are guarded: a customer session can never render staff screens.

<p align="center">
  <img src="support-frontend/public/favicon.svg" width="96" alt="NoCap Support logo" />
</p>

<h1 align="center">NoCap Support Desk</h1>

> **Customer support that doesn't drop the ball.**
>
> A self-hosted helpdesk where customers raise tickets, chat with your team in real time, and watch every issue move from *Open* to *Solved* — no lost emails, no "did anyone reply?", no tickets falling through the cracks.

![Stack](https://img.shields.io/badge/stack-Spring%20Boot%20%7C%20React%20%7C%20SQLite-informational)
![Java](https://img.shields.io/badge/Java-21-orange)
![React](https://img.shields.io/badge/React-18%20%2B%20Vite-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Why NoCap?

Most small teams handle support in a messy mix of email threads, spreadsheets, and "someone will get to it." NoCap replaces all of that with **one clean system**:

| For your **customers** | For your **team** |
|---|---|
| 📝 Raise a ticket in seconds | 📊 Dashboard with live status counts |
| 💬 Chat thread on every ticket | 👥 Agents claim tickets, admins assign |
| 🔄 Clear status: Open → Pending → Solved → Closed | 🔒 Role-based access — everyone sees only what they should |
| 🔁 Reply anytime — it auto-reopens if needed | 📜 Full audit trail baked into every conversation |

---

## 🚀 Quick Start

```bash
# 1. Backend (creates ./support.db automatically)
cd support-backend
mvn spring-boot:run          # → http://localhost:8081

# 2. Frontend (in a second terminal)
cd support-frontend
npm install
npm run dev                  # → http://localhost:5173
```

That's it. The app seeds demo accounts on first run — sign in as a customer, raise a ticket, then sign in as staff and watch it flow through the pipeline.

📖 Detailed setup, API reference, and env vars → [`support-backend/README.md`](support-backend/README.md) · [`support-frontend/README.md`](support-frontend/README.md)

---

## 🏗️ What's Inside

```
support-fullstack/
├── support-backend/    Spring Boot 3 · Java 21 · Spring Security (JWT) · SQLite
│   └── ARCHITECTURE.md  System diagrams, ERD, and design decisions
└── support-frontend/   React 18 · Vite · TailwindCSS
```

- **Zero-install database** — SQLite file, swap to Postgres by changing two config lines
- **Stateless JWT auth** — customers and staff get separate login surfaces, one secure token format
- **Smart status machine** — the backend owns every allowed transition; the UI just renders what the server permits
- **Privacy by design** — customers literally cannot see other people's tickets (they get a 404, not a hint it exists)

---

## 🧪 Quality

```bash
cd support-backend && mvn test    # end-to-end integration tests over MockMvc
```

Covers the full ticket lifecycle, auth boundaries, and role-based access rules against a throwaway database.

---

## 🗺️ Roadmap Ideas

- [ ] Email notifications on status changes
- [ ] File attachments on messages
- [ ] Postgres support out of the box
- [ ] Real-time updates via WebSockets (currently polls every few seconds)

---

<p align="center">
  <sub>Built with ☕ and a lot of tickets.</sub>
</p>

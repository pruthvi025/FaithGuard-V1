# 🛕 FaithGuard

**Privacy-first, community-driven Lost & Found system for temples.**

No login • No tracking • Temporary access only

---

## Project Structure

```
FaithGuard/
├── client/     ← React frontend (deployed on Vercel)
├── server/     ← Express.js backend (deployed on Render)
└── docs (*.md) ← Project documentation
```

## Getting Started

### Frontend (Client)

```bash
cd client
npm install
npm run dev
```

Opens at `http://localhost:3000`

### Backend (Server)

```bash
cd server
cp .env.example .env    # Fill in your Firebase credentials
npm install
npm run dev
```

Runs at `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Express.js, Firebase Admin SDK |
| Database | Firestore |
| Auth | Firebase Authentication |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Documentation

- `ADMIN_SETUP.md` — Admin configuration
- `FIRESTORE_ADMIN_SETUP.md` — Firestore setup
- `NOTIFICATION_SETUP.md` — Push notification config
- `LOST_ITEM_REPORTING_WORKFLOW.md` — Reporting workflow
- `LOCATION_ASSISTANCE_WORKFLOW.md` — Location sharing workflow
# Prajaa Vaani — "People's Voice"

A civic accountability platform: problems don't just get reported, they get an
enforced state machine with a permanent public timeline — a problem can't be
silently ignored or silently closed.

This repo is the **first vertical slice** (walking skeleton): report a problem →
see it on a public list → watch its status move through an enforced sequence →
see every transition recorded permanently. Auth, real SLA-based auto-escalation,
photo upload, and notifications are the next milestones (see backend/README.md).

## 100% free stack used here

| Piece | Tool | Free tier |
|---|---|---|
| Backend | FastAPI (Python) | free to run anywhere |
| Database (local dev) | SQLite | free, zero setup |
| Database (real pilot) | Neon Postgres | generous free tier, no card required |
| Frontend | React + Vite + Tailwind | free |
| Auth | Firebase Authentication (email/password) | free (Spark plan) |
| Animation | Framer Motion | free, open source |
| Backend hosting | Render free web service | free (sleeps when idle) |
| Frontend hosting | Vercel | free (matches your existing deployment pattern) |

No paid API keys, no credit card, required to run or demo this.

## Quick start

**Backend** (terminal 1):
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev
```

Before either will let you report/upvote/rate, set up free Firebase
Authentication — see `backend/README.md` → "Set up login". Takes about 5 minutes.

Open http://localhost:5173 — sign up, report a problem (try the live camera
capture), then open its detail page and use the "Demo: act as an authority"
panel to walk it through the full lifecycle and watch the public timeline,
star rating, and funding tracker in real time.

## Project structure

```
prajaa-vaani/
  backend/     FastAPI app — the enforced state machine + event log (the core)
  frontend/    React app — Report / List / Detail with the public timeline UI
```

See `backend/README.md` for the state machine design notes and deployment steps.
"# PrajaaVaani" 

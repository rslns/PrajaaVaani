# Prajaa Vaani — Backend (FastAPI)

## Run locally (zero setup, zero cost)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs (auto-generated, free): http://localhost:8000/docs
Data is stored in a local `prajaavaani.db` SQLite file — nothing to configure.

## Set up login (Firebase Authentication — free)

1. Go to https://console.firebase.google.com → create a project (no card required).
2. Authentication → Sign-in method → enable **Email/Password**.
3. Project Settings → Service Accounts → **Generate new private key** → save the
   downloaded JSON as `backend/serviceAccountKey.json` (already git-ignored).
4. Project Settings → General → scroll to "Your apps" → add a **Web app** → copy
   its config values into `frontend/.env` (see frontend README).

The backend never sees a password — it only verifies the token Firebase already
issued (`app/auth.py`). The **first time** a person signs up, the backend
automatically creates a matching `User` row with `role="citizen"`.

### Promoting a demo account to officer/admin

There's no admin UI yet — for your demo, sign up normally, then open
`prajaavaani.db` (e.g. with "DB Browser for SQLite", free) and change that
user's `role` column to `officer` or `admin`. That account can then edit the
funding tracker on problems.

## Switch to a real free Postgres database

1. Create a free project at https://neon.tech (no credit card required).
2. Copy the connection string it gives you.
3. Copy `.env.example` to `.env` and paste it in as `DATABASE_URL=...`.
4. Restart the server — tables are created automatically on first run.

## Deploy for free

- **Render** (render.com) free web service tier works for this FastAPI app.
  Build command: `pip install -r requirements.txt`
  Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  Set `DATABASE_URL` and `FIREBASE_SERVICE_ACCOUNT_PATH` (or paste the JSON
  contents into an env var and write it to disk on startup) in Render's dashboard.
  Free Render services sleep after inactivity — fine for a demo, not production.
- Live camera capture (`getUserMedia`) only works over **HTTPS** or on
  `localhost` — Render and Vercel both serve HTTPS by default, so this only
  matters if you try to test on a plain-HTTP LAN address from your phone.

## On the funding feature — why there's no "Pay" button

This app tracks funding (estimated / pledged / received) but does **not**
collect payments itself. Handling money on behalf of the public raises real
legal and accountability questions (who legally holds it, compliance,
misuse risk) that a student project isn't set up to answer. Instead,
`funding_link` points at an already-compliant external platform (a
registered NGO/CSR partner, Milaap/Ketto, or a verified UPI ID) — the app's
job is transparency (showing where the money is meant to go and how much has
arrived), not custody of the money. Revisit in-app collection only if you
partner with a real institution willing to be legally responsible for it.

## What's here vs. what's next

Core pieces in this pass:
- Real accounts via Firebase (email/password) — no more free-text reporter names
- One vote per citizen (`Upvote`, unique per user+problem) and one severity
  rating per citizen (`SeverityRating`), both feeding `priority_score`
- Live in-app camera capture support (`is_live_capture` flag on media)
- Funding tracker fields (informational, no payment processing)
- The event-sourced state machine and enforced transitions from the first pass

Deliberately not built yet, in order:
1. Role-scoped status updates (right now any logged-in user can act as any
   demo role — the real system should check that the *current authority
   level* matches the acting user before allowing a transition)
2. The scheduled job that auto-inserts a `system`-actor escalation event when
   a problem sits past its SLA
3. Email notifications on status change
4. Moving uploaded media off local disk (Cloudinary/Supabase Storage, both
   free-tier) so files survive a redeploy

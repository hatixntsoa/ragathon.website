# RAGATHON

Build. Evaluate. Rank. A competitive platform for RAG model builders: participants log in, pull a private dataset, train on Kaggle, upload `model.pkl` + `notebook.ipynb`, and get scored by an automated backend evaluation engine. Admins control the countdown timer (synced over WebSocket to every client) and can export the leaderboard, a full PDF report, or a raw database backup.

Domain target: `ragathon.ilaikoto.com`

## Stack

- **Frontend:** React (Vite) + TypeScript + Tailwind CSS + Lucide icons + react-i18next (EN/FR)
- **Backend:** Node.js + Express + Socket.io + better-sqlite3 (TypeScript, strict mode)
- **Database:** SQLite at `backend/data/ragathon.db`
- **Infra:** Docker Compose with an Nginx reverse proxy in front of both services

## Project structure

```
ragathon/
├── PROMPT.md               # original spec this project was built from
├── README.md
├── docker-compose.yml
├── .gitignore
├── nginx/
│   └── nginx.conf          # reverse proxy: /api -> backend, / -> frontend
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/                # SQLite lives here at runtime (git-ignored)
│   └── src/
│       ├── index.ts         # Express + Socket.io entrypoint
│       ├── db.ts            # schema + seed
│       ├── socket.ts        # drift-free timer sync
│       ├── middleware/auth.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── submission.ts
│       │   ├── evaluation.ts
│       │   ├── export.ts
│       │   └── admin.ts
│       └── types/index.ts
└── frontend/
    ├── Dockerfile            # multi-stage: Node build -> Nginx serve
    ├── nginx.frontend.conf   # SPA fallback inside the frontend container
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── i18n/ (index.ts, locales/en.json, locales/fr.json)
        ├── lib/ (api.ts, socket.ts)
        ├── context/AuthContext.tsx
        ├── types/index.ts
        ├── components/ (Navbar, Footer, LanguageSwitcher, Timer, Leaderboard, ProtectedRoute)
        └── pages/ (LandingPage, Login, Signup, ParticipantDashboard, AdminDashboard)
```

## 1. Run standalone (no Docker)

Requires Node.js 18+.

### Backend

```bash
cd backend
npm install
npm run dev
```

This starts the API on `http://localhost:4000`, creates `backend/data/ragathon.db` on first run, and seeds a default admin account:

```
email: admin@ragathon.local
password: admin123
```

**Change this password (or delete and re-seed the DB) before deploying anywhere real.**

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

This starts Vite on `http://localhost:5173`. It proxies `/api` and `/socket.io` to `http://localhost:4000` automatically (see `frontend/vite.config.ts`), so no `.env` file is required for local dev.

Open `http://localhost:5173`.

### Production build (standalone)

```bash
# backend
cd backend
npm run build
npm start          # serves on PORT (default 4000)

# frontend
cd frontend
npm run build       # outputs to frontend/dist
npm run preview     # or serve dist/ with any static file server
```

## 2. Run with Docker

Requires Docker + Docker Compose.

From the project root:

```bash
docker-compose up --build
```

This builds and starts three containers:

- `ragathon-backend` — Node API on an internal port (4000), not published to the host directly
- `ragathon-frontend` — static build served by Nginx internally
- `ragathon-nginx` — the public entrypoint, published on host port **80**, reverse-proxying `/api` and `/socket.io` to the backend and everything else to the frontend

Open `http://localhost` (port 80).

The SQLite database persists in a named Docker volume (`ragathon-db`) mounted at `/app/data` in the backend container, so `docker-compose down` (without `-v`) keeps your data.

To stop:

```bash
docker-compose down
```

To stop and wipe the database volume:

```bash
docker-compose down -v
```

### Environment variables (Docker)

Set these in a `.env` file at the project root before running `docker-compose up` if you want to override defaults:

```
JWT_SECRET=replace_with_a_long_random_string
CORS_ORIGIN=http://localhost
```

### Going to production (ragathon.ilaikoto.com)

1. Point the DNS `A` record for `ragathon.ilaikoto.com` at your host.
2. Update `nginx/nginx.conf`'s `server_name` if you deploy under a different domain.
3. Obtain TLS certificates (e.g. via certbot) and mount them into the `nginx` service:
   - Uncomment the `443` listener and `ssl_certificate*` lines in `nginx/nginx.conf`.
   - Uncomment the `- "443:443"` port and the certs volume mount in `docker-compose.yml`.
4. Rebuild: `docker-compose up --build -d`.

## API overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | - | Create a participant account |
| POST | `/api/auth/login` | - | Log in, returns JWT |
| GET | `/api/auth/me` | user/admin | Current user info |
| POST | `/api/submissions` | user | Upload `model.pkl` + `notebook.ipynb` |
| GET | `/api/submissions/mine` | user | Your submission history |
| GET | `/api/submissions/leaderboard` | - | Public leaderboard (best score per user) |
| POST | `/api/evaluation/:id/rerun` | admin | Manually re-trigger evaluation |
| GET | `/api/export/leaderboard.csv` | admin | Download leaderboard CSV |
| GET | `/api/export/report.pdf` | admin | Download full PDF report |
| GET | `/api/export/database` | admin | Download raw `ragathon.db` |
| GET/POST | `/api/admin/timer/*` | admin | Timer status / start / pause / reset / duration |
| GET | `/api/admin/users` | admin | Users + submission history |

Timer state is also pushed live over Socket.io (`timer:update` event) to every connected client whenever an admin changes it.

## Notes on the evaluation engine

The evaluation step (`backend/src/routes/evaluation.ts`) is intentionally mocked: it simulates a sandboxed run against a hidden test set with a short delay and a randomized-but-plausible train/test score pair, flagging overfitting when the gap exceeds a threshold. Swap `runEvaluation()` for a real sandboxed execution pipeline (e.g. a disposable container or job queue worker) when wiring this up to an actual model-scoring backend.

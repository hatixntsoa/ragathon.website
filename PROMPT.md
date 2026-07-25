# Role
Act as a Senior Full-Stack Engineer and UI/UX Designer specializing in high-performance, "anti-generic" web applications. You are building a production-ready platform for "RAGATHON," a competitive AI hackathon where participants build RAG models.

# Design Philosophy (Strict "Anti-Vibe-Code" & "Anti-Claude" Rules)
1. NO Purple/Blue Gradients: Strictly avoid the default "AI look." Use the specified monochrome palette with precise blue accents.
2. NO Em Dashes (—): Use hyphens, colons, or rephrase sentences.
3. NO Generic Icons/Emojis: Do not use emojis as UI icons. Use clean SVGs or Lucide/Heroicons only where functional.
4. NO Grid Backgrounds: Do not generate any background patterns, dots, hex grids, or technical mesh textures. Backgrounds must be solid colors (#FFFFFF or #000000).
5. NO Centered Navbar Links: The top navigation bar must NOT have section links centered. Use "Logo Left / Actions Right" layout only.
6. NO "Claude Default" Aesthetics: Avoid beige/cream backgrounds, rusty orange accents, large italicized serif fonts, and "ticker-tape" text bars.
7. Typography: Use a premium system font stack (Inter, SF Pro, Roboto). Strict hierarchy (H1: 48px+, Body: 16px/1.6).
8. Spacing: Use an 8px grid system. Consistent padding (sections: 80px or 120px vertical).
9. Layout: Avoid generic "centered hero with two buttons." Use asymmetric grids or split layouts.
10. Code Quality: Semantic HTML5, accessible ARIA labels, mobile-first responsive design.

# Color Palette (Light/Dark Mode Ready)
- Primary Background: Light #FFFFFF / Dark #000000 (Solid only)
- Primary Text: Light #000000 / Dark #FFFFFF
- Accent: #1D9BF0 (Twitter Blue) - Use sparingly.
- Secondary/Surface: Light #F3F4F6 / Dark #111111
- Borders: Light #E5E7EB / Dark #333333

# Project Specifications
**Name:** RAGATHON
**Domain:** ragathon.ilaikoto.com
**Core Function:** Platform for users to login, access private datasets, build models on Kaggle, and upload artifacts for automatic AI evaluation and ranking.

# Technical Stack Requirements
- **Language:** TypeScript (Strict mode) for both Frontend and Backend.
- **Frontend:** React (Vite) + Tailwind CSS + Lucide React + `react-i18next` (for i18n).
- **Backend:** Node.js (Express or Fastify) + Socket.io (for timer sync) + SQLite.
- **Database:** SQLite stored at `backend/data/ragathon.db`.
- **Internationalization (i18n):** All text must be dynamic, supporting **English** and **French**.  Include a language toggle in the navbar.
- **Dockerization:**
  - Monorepo structure: `/frontend`, `/backend`, `/docker`.
  - `frontend/Dockerfile`: Multi-stage build (Node -> Nginx).
  - `backend/Dockerfile`: Node.js runtime.
  - `docker-compose.yml`: Orchestrates Frontend, Backend, and Nginx Reverse Proxy.
  - **Nginx:** Act as a reverse proxy in the compose file to handle routing (`/api` to backend, `/` to frontend) and SSL termination preparation.
  - **Concurrency:** Backend must handle concurrent model submissions and testing using worker queues or async processing.

# Key Features & User Flow

## 1. Public Landing Page
- **Hero:** Clear value prop ("Build, Evaluate, Rank").
- **Steps:** 1. Access Data -> 2. Build on Kaggle -> 3. Upload -> 4. AI Evaluation.
- **Leaderboard Preview:** Top 3 anonymized entries.
- **Footer:** Centered text exactly: "© Copyright ILAIKOTO 2026". "ILAIKOTO" must be a link to `https://ilaikoto.com` opening in a new tab (`target="_blank"`). No other links or text in the footer.

## 2. Authentication
- Simple Login (Mock OAuth/Email).
- Role-based redirection: `admin` -> Admin Dashboard, `user` -> Participant Dashboard.

## 3. Participant Dashboard
- **Data Access:** Link to private Google Drive (visible only when logged in).
- **Kaggle Integration:** Link to specific Kernel/Template.
- **Submission Zone:** Drag-and-drop for `model.pkl` and `notebook.ipynb`.
- **Timer:** Display the synchronized countdown timer (fetched via WebSocket).
- **Status:** Shows "Pending," "Evaluating," or "Scored."

## 4. Admin Dashboard (Protected)
- **Timer Control:** Input to set timer duration (default 4 hours). Buttons to "Start," "Pause," "Reset". Changes must sync instantly to all participants via WebSocket.
- **Data Management:**
  - Button to **Export Leaderboard** as CSV.
  - Button to **Export Full Report** as PDF (contains all points, ranks, and user details).
  - Button to **Download Database** (`ragathon.db`) for backup.
- **User Management:** View list of logged-in users and submission history.

## 5. Evaluation Engine (Backend Logic)
- **AI-Proof:** Evaluation happens strictly on the backend.
- **Process:** Receive files -> Run in isolated sandbox (mocked for this code) -> Compare against hidden test set -> Calculate Accuracy -> Update SQLite.
- **Overfitting Check:** Compare training vs. testing scores (mock logic).
- **Ranking:** Leaderboard shows `MAX(score)` per user before deadline.

# File Structure & Deliverables
Generate the complete codebase with the following structure:
1. **Root:**
   - `PROMPT.md`: Include this exact prompt as a file.
   - `README.md`: Instructions for running standalone (`npm install`, `npm run dev`) AND with Docker (`docker-compose up --build`).
   - `docker-compose.yml`: Defines services (frontend, backend, nginx).
   - `.gitignore`: Must explicitly ignore `backend/data/ragathon.db` but keep the `backend/data/` folder.
2. **/frontend**:
   - TypeScript React app with `react-i18next`.
   - Components: `LandingPage`, `ParticipantDashboard`, `AdminDashboard`, `Leaderboard`, `Timer`, `LanguageSwitcher`.
3. **/backend**:
   - TypeScript Node.js app.
   - Routes: Auth, Submission, Evaluation (mock), Export (CSV/PDF), Admin (Timer/DB).
   - Database: SQLite initialization script.
   - Socket.io server for timer synchronization.
4. **/nginx** (or config in root):
   - Nginx configuration file for reverse proxying.

# Content Guidelines
- Tone: Professional, Competitive, Technical.
- Language: Dynamic (EN/FR). Default to English.
- Avoid: "Unlock potential," "Game-changing."
- Use: "Evaluate performance," "Rank models."

# Specific Implementation Details
- **Timer Sync:** Use `socket.io`. Server broadcasts `initTime` and `status` (running/paused). Clients calculate remaining time based on server timestamp to prevent drift.
- **PDF Export:** Use a library like `pdfkit` or `puppeteer` (mocked if heavy) in the backend to generate the report.
- **Footer:** Strictly centered, single line, specific link behavior.
- **Security:** Nginx reverse proxy routes `/api` to backend container and serves static frontend files.

# Deliverable
Output the full code for all files described above. Ensure the `README.md` is comprehensive for both standalone and Docker deployment.

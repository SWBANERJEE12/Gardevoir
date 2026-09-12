# Gardevoir

AI-powered adversarial health-check platform for web applications.

> Don't just scan. Understand.

Gardevoir runs bounded, non-destructive security assessments, scores the result, and shows **exactly which regions** of a site are secure and which are not.

---

## What you need

- **Windows** (or any OS with Python + Node)
- **Python 3.11+** (`py -3` on Windows)
- **Node.js 18+** and npm
- A browser

Optional:

- OpenAI-compatible `AI_API_KEY` for live analyst mode (works in demo mode without it)
- Google and GitHub OAuth client IDs for social sign-in

---

## Quick start (Windows)

1. Unzip this folder.
2. Double-click **`START_LOCALHOST.bat`**.
3. Open [http://localhost:3000](http://localhost:3000).

That starts three processes:

| Service | URL |
| --- | --- |
| Frontend (Gardevoir UI) | http://localhost:3000 |
| API engine | http://localhost:8000 |
| Demo target shop | http://localhost:5001 |

### Manual start (any OS)

**1. Demo target (port 5001)**

```bash
cd demo-target
python -m pip install -r requirements.txt
python app.py
```

**2. Backend (port 8000)**

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**3. Frontend (port 3000)**

```bash
cd frontend
npm install
npm run dev
```

---

## How to use the app

1. Click the **sphere**, then **Sign In →**.
2. Create an account with **email + password** (at least 8 characters), or use Google / GitHub if configured.
3. On **Home**, enter a target URL you are authorized to test, or use **Demo target** (`http://localhost:5001`).
4. Watch the live assessment, then read:
   - overall score and label
   - perfectly secure vs vulnerable regions
   - why points were lost
   - findings and AI timeline

---

## Scoring labels

| Score | Label |
| --- | --- |
| 100 | Perfect score |
| 90–99 | Near perfect score |
| 70–89 | Well secured |
| 55–69 | Moderately secure |
| 30–54 | Low score |
| 0–29 | **NOT SECURED** (warning) |

Base score is 100. Penalties: Critical −25, High −15, Medium −8, Low −3.

---

## Optional environment

Copy `backend/.env.example` to `backend/.env`:

```
AI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
JWT_SECRET=gardevoir-local-dev-secret-change-me
FRONTEND_URL=http://localhost:3000
API_PUBLIC_URL=http://localhost:8000
```

OAuth redirect URIs:

- Google: `http://localhost:8000/api/auth/google/callback`
- GitHub: `http://localhost:8000/api/auth/github/callback`

Email/password sign-up works with no extra keys.

---

## Project layout

```
backend/          FastAPI engine, scanners, scoring, auth
frontend/         Next.js UI (start, login, home, results)
demo-target/      Intentional weak shop for demos
START_LOCALHOST.bat
README.md
```

Assessments are **safe by design**: allowlisted tests only, rate-limited, non-destructive. Only scan hosts you own or are explicitly authorized to test.

---

## Sharing notes

This zip is **source code**. Recipients run `npm install` and `pip install` locally. `node_modules` and Python caches are not included on purpose.

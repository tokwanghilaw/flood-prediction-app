
# Flood Prediction App

A full-stack flood prediction system with a Next.js frontend, Node.js backend API, Python ML service, and PostgreSQL database.

**Status:** Active development with Vercel monorepo deployment support.

**Tech stack:** 
- Frontend: Next.js + React (TypeScript)
- Backend: Express + Node.js (TypeScript) + Prisma ORM
- ML Service: Python (ConvLSTM model)
- Database: PostgreSQL (Supabase)
- Deployment: Vercel (monorepo mode)

**Repository layout**

- `backend/` : Express API server with Prisma ORM
- `frontend/` : Next.js application
- `python_service/` : Python prediction service (ConvLSTM model)
- `vercel.json` : Monorepo deployment config

**Quick Start (local development)**

Prerequisites:
- Node.js 18+
- Python 3.9+
- PostgreSQL database (or Supabase)

**Step 1: Install dependencies**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**Step 2: Set up environment variables**

Create `.env` files:

`backend/.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/floodforecast"
PYTHON_API_URL=http://localhost:8000
PORT=5000
NODE_ENV=development
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
```

**Step 3: Start services in separate terminals**

**Terminal 1: Backend API**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3: Python service**
```bash
cd python_service
python -m venv .venv
.venv\Scripts\activate  # or `source .venv/bin/activate` on Mac/Linux
pip install -r requirements.txt
python app.py
# Runs on http://localhost:8000
```

Frontend available at `http://localhost:3000`.

**Environment Variables**

**Backend (backend/.env)**

- `DATABASE_URL` ⭐ (required) - PostgreSQL connection string
- `PYTHON_API_URL` - URL of Python prediction service (default: `http://localhost:8000`)
- `PORT` - HTTP port (default: `5000`)
- `NODE_ENV` - `development` or `production`

**Frontend (frontend/.env.local or .env.production)**

- `NEXT_PUBLIC_API_URL` - Backend API URL
  - **Local dev:** `http://localhost:5000`
  - **Vercel:** leave empty or set to `/backend` for monorepo routing
- `NEXT_PUBLIC_SUPABASE_URL` ⭐ (required) - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` ⭐ (required) - Supabase publishable key

Note: Frontend variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

**API Endpoints**

**Prediction**
```
POST /api/predict
Body: { rainfall: number[], lake_level: number[] }
Returns: { hours: [...], bounds: {...}, dem_png: string, ... }
```

**Save Prediction**
```
POST /api/save-prediction
Body: { prediction: {...}, rainfall: number[], lake_level: number[] }
Returns: { success: boolean, id: number }
```

**History**
```
GET /api/history
Returns: [{ id, createdAt, rainfall, lake_level }, ...]
```

**Health Check**
```
GET /api/test
Returns: { status: 'ok', message: '...' }
```

For full endpoint details, see [backend/src/server.ts](backend/src/server.ts#L1).

**Deployment to Vercel**

This monorepo is configured for Vercel using `vercel.json`:

```json
{
  "experimentalServices": {
    "frontend": {
      "entrypoint": "frontend",
      "routePrefix": "/"
    },
    "backend": {
      "entrypoint": "backend",
      "routePrefix": "/backend"
    }
  }
}
```

**Steps:**

1. Connect repo to Vercel
2. Set environment variables in Vercel Project Settings:
   - `DATABASE_URL` (PostgreSQL connection)
   - `PYTHON_API_URL` (URL of deployed Python service)
   - `NEXT_PUBLIC_API_URL` (should be `/backend` for monorepo)
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
3. Deploy

The frontend will call the backend via `/backend` routes automatically.

**Important:** The Python ML service must be hosted separately (e.g., on Railway, Hugging Face Spaces, or your own server) and its URL set in `PYTHON_API_URL`.

**Development vs Production**

| Aspect | Local Dev | Production |
|--------|-----------|------------|
| Backend start | `npm run dev` (TypeScript) | `npm run build && npm run start` (compiled JS) |
| Frontend API URL | `http://localhost:5000` | `/backend` (Vercel monorepo routing) |
| Python service | `http://localhost:8000` | `${PYTHON_API_URL}` env var |
| Database | Local PostgreSQL or Supabase | Supabase (via `DATABASE_URL`) |

**Testing**

```bash
# Backend tests (when available)
cd backend
npm test

# Frontend tests (when available)
cd frontend
npm test
```

**Troubleshooting**

**Frontend can't reach backend:**
- Local: Make sure `NEXT_PUBLIC_API_URL=http://localhost:5000` is set in `frontend/.env.local`
- Vercel: Ensure backend service is properly configured in `vercel.json` and responding on `/backend` prefix

**Python service errors:**
- Verify Python venv is activated
- Check `PYTHON_API_URL` is set correctly in `backend/.env`
- Backend will return a helpful error message if Python service is unreachable

**Database connection errors:**
- Verify `DATABASE_URL` is correct (check Supabase credentials)
- Run `npx prisma generate` in both `backend/` and `frontend/` to sync schema

**Contributing**

Fork the repo, create feature branches, and submit PRs. Keep commits focused and include tests where appropriate.

**Resources**

- Backend entry: [backend/src/server.ts](backend/src/server.ts#L1)
- Frontend entry: [frontend/pages/index.tsx](frontend/pages/index.tsx)
- Database schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Vercel config: [vercel.json](vercel.json)


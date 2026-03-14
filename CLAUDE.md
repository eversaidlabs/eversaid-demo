# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EverSaid is an audio transcription application with AI-powered cleanup and analysis. It consists of:
- **frontend/** - Next.js 16 with App Router, Tailwind CSS v4, shadcn/ui
- **backend/** - FastAPI wrapper that proxies to a private Core API

Two user modes:
- **Demo mode**: Anonymous users get auto-generated accounts, rate-limited access
- **Dashboard mode**: Authenticated users with tenant/user quotas

## Development Commands

### Frontend (in `frontend/`)
```bash
npm install                                  # Install dependencies
npm run dev                                  # Start dev server (port 3000)
npm run build                                # Production build
npm run lint                                 # ESLint
npm run test                                 # Vitest watch mode
npm run test:run                             # Vitest single run
npm run test -- src/lib/diff-utils.test.ts   # Run single test file
npm run test:coverage                        # Vitest with coverage
npm run test:e2e                             # Playwright E2E tests (headless)
npm run test:e2e:ui                          # Playwright interactive UI mode
npm run storybook                            # Component development (port 6006)
```

### Backend (in `backend/`)
```bash
pip install -r requirements-dev.txt          # Install dependencies (includes test deps)
uvicorn app.main:app --reload --port 8001    # Start dev server
pytest tests/ -v                             # Run all tests
pytest tests/test_session.py -v              # Run single test file
pytest tests/ -k "test_name" -v              # Run tests matching pattern
```

### Database Migrations (in `backend/`)
```bash
alembic revision --autogenerate -m "description"  # Create migration from model changes
alembic upgrade head                              # Apply all pending migrations
alembic downgrade -1                              # Roll back one migration
alembic current                                   # Show current migration version
alembic history                                   # Show migration history
```

Migrations run automatically on app startup via `run_migrations()` in `app/main.py`. No separate migration step is needed in Docker or development.

### Docker
```bash
docker compose up                        # Dev: frontend + backend
docker compose --profile production up   # Prod: adds nginx reverse proxy
```

**Important**: When adding new environment variables to `docker-compose.yml`, you MUST also add them to:
- `docker-compose.staging.yml`
- `docker-compose.prod.yml`

All three files must stay in sync for environment variables.

## Architecture

```
Frontend (Next.js) → Wrapper Backend (FastAPI) → Core API (private)
```

The wrapper backend handles:
- Anonymous session management (cookies) for demo users
- Multi-tenant JWT authentication for dashboard users
- Rate limiting (per-session, per-IP, global)
- Proxying requests with Bearer auth to Core API
- Feedback and waitlist collection (PostgreSQL)

## Frontend Architecture Rules

### Component Structure
- **V0 components are PRESENTATION ONLY** - no useState, no business logic
- All business logic goes in `src/features/` hooks
- All API calls go through `src/features/transcription/api.ts`
- Containers in pages wire hooks to presentation components

### Key Directories
```
src/
├── app/[locale]/           # Next.js routes with i18n
│   ├── (dashboard)/        # Authenticated dashboard routes (uses route group)
│   │   ├── audio/          # Audio transcription entries
│   │   └── text/           # Text cleanup entries
│   ├── demo/               # Demo mode pages
│   ├── login/              # Auth pages
│   └── change-password/
├── components/             # Presentation components (demo/, dashboard/, landing/, ui/)
├── features/               # Business logic hooks
│   ├── transcription/      # Demo mode hooks and API
│   │   ├── api.ts          # All demo API calls
│   │   └── types.ts        # TypeScript types
│   ├── auth/               # Authentication (login, tokens, context)
│   └── dashboard/          # Dashboard hooks (entry list, quota, actions)
├── lib/                    # Utilities (session, storage, diff-utils)
├── i18n/                   # Internationalization config
└── messages/               # Translation files (sl.json, en.json)
```

### i18n
- Uses next-intl with Slovenian (sl) and English (en)
- All user-facing text must use translations
- Slovenian plurals: 1=one, 2=two, 3-4=few, 5+=other

### Key Libraries
- Custom diff utilities (`src/lib/diff-utils.ts`): LCS-based segment-level diff computation
- react-virtuoso: Virtualized scrolling for long transcript segment lists
- Motion.js: Animations
- Sonner: Toast notifications
- react-hook-form + Zod: Form validation
- recharts: Data visualization for analysis results

### Testing
- **Frontend unit tests**: `src/**/*.test.{ts,tsx}` (co-located with source, setup in `src/tests/setup.ts`)
- **Frontend E2E tests**: `e2e/*.spec.ts` (Playwright, mocks in `e2e/mocks/setup-mocks.ts`)
- **Backend tests**: `tests/*.py` (pytest)

### CI/CD
- **PR Tests** (`.github/workflows/pr-tests.yml`): Runs on every PR — frontend unit tests, E2E tests, Storybook build; backend unit tests with PostgreSQL service
- **Deploy** (`.github/workflows/deploy.yml`): Runs unit tests only (E2E already passed in PR)

## Backend Architecture

### Key Files
```
backend/app/
├── main.py          # FastAPI app, lifespan, error handlers
├── config.py        # Pydantic Settings (env vars)
├── database.py      # PostgreSQL connection with schema isolation
├── core_client.py   # HTTP client for Core API
├── middleware/
│   ├── auth.py      # JWT authentication dependencies
│   └── logging.py   # Request/response logging
├── services/
│   ├── auth.py      # Auth business logic (login, tokens, users)
│   └── quota.py     # Quota limits computation (user + tenant)
├── models/
│   ├── core.py      # Session, RateLimitEntry, Feedback, Waitlist
│   └── auth.py      # Tenant, User, AuthSession, UserRole
├── utils/
│   ├── jwt.py       # JWT token creation/verification
│   └── security.py  # Password hashing (bcrypt)
└── routes/
    ├── core.py      # Core API proxy endpoints (transcription, cleanup, analysis)
    ├── local.py     # Local endpoints (feedback, waitlist)
    ├── auth.py      # /api/auth/* (login, refresh, logout, me)
    ├── admin.py     # /api/admin/* (tenants, users)
    ├── quota.py     # /api/quota (user quota limits and usage)
    └── api_keys.py  # /api/api-keys/* (API key management)
```

### Environment Variables
Key backend configuration (see `docker-compose.yml` for full list):
- `CORE_API_URL` - Core API base URL (default: http://localhost:8000)
- `DATABASE_*` - PostgreSQL connection (HOST, PORT, NAME, USER, PASSWORD)
- `DB_SCHEMA` - PostgreSQL schema for table isolation (default: platform_dev)
- `JWT_SECRET_KEY` - Required in production for token signing
- `RATE_LIMIT_DAY` / `RATE_LIMIT_IP_DAY` / `RATE_LIMIT_GLOBAL_DAY` - Transcription limits
- `RATE_LIMIT_LLM_*` - LLM/analysis limits (10x transcription by default)
- `LOG_FORMAT` - "text" (dev) or "json" (production/Loki)

### Multi-Tenant Auth System
- **Tenants**: Organizations that own users
- **Users**: Belong to one tenant, have roles (platform_admin, tenant_admin, tenant_user)
- **Role-based access**: Platform admins manage all tenants; tenant admins manage users in their tenant only
- **JWT tokens**: Access tokens (15min) + refresh tokens (30 days) with rotation
- **Password hashing**: bcrypt via `bcrypt` library

### Rate Limiting (Demo Mode)
- Multi-tier: per-session/day, per-IP/day, global/day
- LLM limits are 10x higher than transcription limits
- "Count successes, not attempts": Rate limits committed only after successful Core API calls (small race window accepted for better UX)
- Auth endpoints have separate IP-based rate limiting (15-minute window)

### Quota System (Dashboard Mode)
- **Tenant limits**: Organization-wide limits (transcription_seconds, text_cleanup_words, analysis_count)
- **User limits**: Per-user limits within a tenant
- **Effective limits**: Minimum of user and tenant limits per field
- `2147483647` (INT_MAX) = effectively unlimited
- Usage tracked in Core API, limits stored in wrapper backend

### Session Management (Demo Mode)
- Anonymous sessions via cookies (`eversaid_session_id`)
- Auto-registration with Core API using `anon-{uuid}@anon.eversaid.example`
- Token refresh when within 1 hour of expiry

## Design System

### Colors
- Navy: #1D3557, Coral: #E85D04, White: #FFFFFF, Gray: #F5F5F5
- Style: Professional European B2B
- Avoid: Purple gradients, neon, 3D objects, startup aesthetics

### Speaker Colors (Diarization)
- Speaker 0: Blue #3B82F6
- Speaker 1: Green #10B981
- Speaker 2: Purple #8B5CF6
- Speaker 3: Amber #F59E0B
- Speaker 4+: Cycle through above

### UI Conventions
- Border radius: rounded-lg
- Shadows: shadow-sm
- shadcn/ui with New York style, Zinc base

## Demo Content System

Demo entries are automatically created for anonymous users via a PostgreSQL trigger in Core API.

### How it works
1. PostgreSQL trigger fires on new anonymous user creation (`anon-*@anon.eversaid.example`)
2. Trigger copies demo entries from `demo@system.eversaid.example` to the new user
3. Demo entries identified by filename pattern `demo-*.mp3` (e.g., `demo-sl.mp3`, `demo-en.mp3`)
4. Users see demo entries in their history and can trigger cleanup/analysis fresh

### Seeding Demo Content
```bash
# In Core API repo (smart-transcribe-api/)
# Requires ENCRYPTION_ENABLED=false on the API for unencrypted demo entries

export DEMO_USER_PASSWORD="your-password"
export API_URL="http://localhost:8000"

python scripts/seed_demo_content.py                    # Seed demo content
python scripts/seed_demo_content.py --check            # Check status
python scripts/seed_demo_content.py --replace          # Replace existing demo
python scripts/seed_demo_content.py --demo-audio /path # Custom audio directory
```

### E2E Test Mocks
- `frontend/e2e/mocks/setup-mocks.ts` - Centralized mock data for Playwright tests
- Demo entries mocked via standard `/api/entries/*` routes (no special demo endpoints)

## Known Limitations

Workarounds for Core API limitations identified during development:

- Entry detail missing related resources — 5 API calls instead of 1 (`backend/app/routes/core.py` GET entry detail)
- Analyses list missing `result` field — requires extra fetch per profile (`frontend/src/features/transcription/useAnalysis.ts`)
- No `?profile_id=` filter on analyses endpoint — must fetch all and filter client-side

These add latency but allowed shipping fast to validate demand first.
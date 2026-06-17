# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jelajah is a collaborative travel-planning app (CS50W final project): Django REST Framework API + React SPA. It manages trips, itineraries, expenses (with splitting), packing lists, checklists, and role-based trip members.

## Repository layout

- `backend/` — Django REST Framework API (the source of truth for data and auth).
- `frontend/` — The **active, production** React SPA (React 19 + Vite + Tailwind v4). This is the app deployed to `jelajah.raya.bio` and referenced throughout `README.md`.
- `frontend-v2/` — A **work-in-progress** redesign exported from Figma Make (React 18, MUI + shadcn/Radix, TypeScript). It is UI/prototype scaffolding only: no API integration, tests, or lint config, and not wired into Docker/CI/deploy. The current branch `feat/frontend-v2` is iterating on it. Do not assume v2 has backend connectivity.

## Commands

### Backend (`cd backend`)
- Run server: `python manage.py runserver`
- Migrate: `python manage.py migrate`
- All tests: `python manage.py test`
- Single app / test: `python manage.py test trips` or `python manage.py test trips.tests.TestClass.test_method`
- Create superuser: `python manage.py createsuperuser`

### Frontend v1 (`cd frontend`)
- Dev (vite + eslint watch): `npm run dev` (port 5173)
- Build: `npm run build`
- Lint: `npm run lint`
- Tests (vitest): `npm run test`  — run a single file: `npx vitest run src/tests/<file>`

### Frontend v2 (`cd frontend-v2`)
- Dev: `npm run dev`; Build: `npm run build`. No lint or test scripts exist.

### Docker (full stack)
`docker-compose up --build` brings up backend (8000), frontend v1 (5173), and PostgreSQL (5432). Prefix manage.py commands with `docker-compose exec backend`. Note: `docker-compose.yml` wires up `frontend/`, not `frontend-v2/`.

## Environment

- `backend/.env` requires: `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `SENDGRID_API_KEY` (leave empty to skip email locally), `DEFAULT_FROM_EMAIL`. In production `DATABASE_URL` is read via `dj-database-url`; locally it falls back to a local PostgreSQL config.
- `frontend/.env` requires: `VITE_BACKEND_URL` (e.g. `http://localhost:8000/api`).

## Backend architecture

- **Six domain apps**, each self-contained with its own `models.py`, `serializers.py`, `views.py` (ViewSets), `permissions.py`, `urls.py`, `tests.py`: `users`, `trips`, `itineraries`, `expenses`, `packing`, `checklist`.
- **`Trip` is the central hub.** Every domain except `users` foreign-keys back to a trip. URLs are nested under the trip: `/api/trips/<trip_id>/<domain>/items/` plus a per-domain `/statistics/` action. Global category/type lists live at non-nested paths (e.g. `/api/expenses/categories/`, `/api/itineraries/types/`) and ship as data migrations with default rows.
- **`backend/backend/` is shared infrastructure**, not just config:
  - `models.py` defines `BaseModel` (UUID primary keys + `created_at`/`updated_at`) inherited by all models.
  - `permissions.py` / `services.py` hold cross-app permission helpers and the SendGrid `send_email()` wrapper that renders templates from `backend/templates/`.
- **Custom user + auth.** `AUTH_USER_MODEL = users.User` (extends `AbstractUser`, email is the login identifier). JWT via `djangorestframework-simplejwt` stored in **HTTP-only cookies**, not localStorage. Custom views `CookieTokenObtainPairView` / `CookieTokenRefreshView` / `CookieTokenBlacklistView` manage the cookies; logout blacklists the token. Auth endpoints are rate-limited.
- **Members & roles.** `TripMember` (through model) gives users a role (ORGANIZER / CO_ORGANIZER / MEMBER) and status (PENDING / ACCEPTED / DECLINED / BLOCKED). Per-app permission classes (`IsTripAccessible`, `IsExpenseAccessible`, etc.) gate access by membership + role; public read is allowed only when the trip's `is_public` is set.
- **Expense splitting.** `Expense` splits across members via the `ExpenseSplit` through model. Serializers validate that split amounts sum to the expense total; creation uses atomic transactions so a partial failure rolls back.
- **Invitation flow.** Inviting an email with no account triggers a set-password email with a tokenized link (`/api/auth/set-password/<user_id>/<token>/`).

## Frontend v1 architecture

- **State via Context API**, one provider per domain: `AuthContext`, `TripsContext`, `TripContext`, `MembersContext`, `ItinerariesContext`, `ExpensesContext`, `ChecklistContext`, `PackingItemsContext`, `TagsContext` (in `src/contexts/`).
- **API access** goes through helpers in `src/lib/utils.js`, which set `axios.defaults.baseURL = VITE_BACKEND_URL` and `withCredentials = true` (required for the HTTP-only auth cookies). Use these helpers rather than calling axios directly.
- **Enums/labels mirroring backend choices** live in `src/configs/` — keep these in sync with backend `TextChoices` when changing domain enums.
- Routing uses `react-router-dom` with auth-aware protected routes.

## CI/CD

- GitHub Actions (`.github/workflows/`) run backend and frontend (`frontend/`) tests on push/PR to `main`. v2 is not covered.
- Deployed on Render via `render.yaml` (backend uses `backend/build.sh` → installs deps, collectstatic, migrate; frontend builds `frontend/`).

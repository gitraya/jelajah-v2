# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jelajah is a collaborative travel-planning app (CS50W final project): Django REST Framework API + React SPA. It manages trips, itineraries, expenses (with splitting), packing lists, checklists, and role-based trip members.

## Repository layout

- `backend/` — Django REST Framework API (the source of truth for data and auth).
- `frontend/` — The **active, production** React SPA (React 19 + Vite + Tailwind v4). This is the app deployed to `jelajah.raya.bio` and referenced throughout `README.md`.
- `frontend-v2/` — A **work-in-progress** redesign originally exported from Figma Make (React 18, MUI + shadcn/Radix, TypeScript, `react-router` v7). Branch `feat/frontend-v2` is iterating on it: it now has real backend wiring (axios + the same domain contexts as v1), but still **no tests, no lint, and no `tsconfig.json`** (so TypeScript is never typechecked — Vite only strips types), and it is not in CI or deploy.

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
- Dev: `npm run dev` (port 5174); Build: `npm run build`. Only these two scripts exist — no lint, test, or typecheck.

### Docker (full stack) — prefer the `Makefile`
`make up` (= `docker compose up --build -d`) brings up backend (8000), frontend v1 (5173), frontend v2 (5174), and PostgreSQL (host port 5433 → container port 5432). Containers connect to PostgreSQL at `db:5432`; host tools connect at `localhost:5433`. `make help` lists all targets; notable ones: `make run` (foreground), `make logs`, `make down`, `make clean` (drops DB + node_modules volumes), `make up-one s=<service>`, `make sh s=<service>`, and backend helpers `make migrate` / `make makemigrations` / `make superuser` / `make test` that exec inside the backend container.

## Environment

- `backend/.env` requires: `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`, `DEFAULT_FROM_EMAIL`. Email providers are optional and tried in order — `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SES_REGION_NAME` (SES, primary; or `AWS_SES_ENABLED=True` when using an instance role) then `SENDGRID_API_KEY` (fallback); leaving both empty skips email locally. Optional: `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` (all four switch media uploads from local `MEDIA_ROOT` to Cloudflare R2; add `R2_PUBLIC_URL` for a public bucket domain, otherwise URLs are signed and expire after a day). Optional: `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (empty disables Google sign-in — `/api/auth/google/` then returns 503). Optional: `ANTHROPIC_API_KEY` (empty disables the AI planner — both `/api/planner/` endpoints then return 503) and `ANTHROPIC_MODEL` (defaults to `claude-opus-5-5`). In production `DATABASE_URL` is read via `dj-database-url`; locally it falls back to a local PostgreSQL config.
- `frontend/.env` and `frontend-v2/.env` each require: `VITE_BACKEND_URL` (e.g. `http://localhost:8000/api`). Both are referenced by `docker-compose.yml`, so a missing v2 `.env` breaks `make up`. `frontend-v2/.env` also takes `VITE_GOOGLE_CLIENT_ID` (same client ID as the backend); empty hides the "Sign in with Google" button.

## Backend architecture

- **Six domain apps** (plus the model-less `planner` app and the `messaging` app below), each self-contained with its own `models.py`, `serializers.py`, `views.py` (ViewSets), `permissions.py`, `urls.py`, `tests.py`: `users`, `trips`, `itineraries`, `expenses`, `packing`, `checklist`.
- **`planner` app (AI trip planner)** has no models: `POST /api/planner/itinerary/` sends the chat (plus the current draft as JSON in the latest user turn, with today's date and the `ItineraryType` names) to Claude via the `anthropic` SDK's structured output (`planner/schemas.py` pydantic models), then cleans the result in `planner/services.py`; `POST /api/planner/itinerary/save/` atomically turns a draft into a trip + itinerary items. Scoped throttles `planner` / `planner_save`. Tests mock `planner.services.anthropic.Anthropic` — never call the real API.
- **`Trip` is the central hub.** Every domain except `users` foreign-keys back to a trip. URLs are nested under the trip: `/api/trips/<trip_id>/<domain>/items/` plus a per-domain `/statistics/` action. Trip-level actions on `TripViewSet`: `cover/`, `duplicate/` (copy a readable trip into a new private one, shifting dates) and `bookmark/` (POST/DELETE a `SavedTrip`; `TripSerializer` exposes annotated `is_saved` / `saves_count`, and `GET /api/trips/?saved=true` lists bookmarks). New trips (normal create, duplicate, planner save) all go through `trips/services.py:create_trip_for_owner`, which adds the owner as accepted ORGANIZER. Global category/type lists live at non-nested paths (e.g. `/api/expenses/categories/`, `/api/itineraries/types/`) and ship as data migrations with default rows.
- **`backend/backend/` is shared infrastructure**, not just config:
  - `models.py` defines `BaseModel` (UUID primary keys + `created_at`/`updated_at`) inherited by all models.
  - `permissions.py` / `services.py` hold cross-app permission helpers and the `send_templated_email()` wrapper that renders templates from `backend/templates/`.
  - `images.py` has `process_image()`, which validates an upload (JPEG/PNG/WebP, ≤ `IMAGE_UPLOAD_MAX_BYTES`), downscales it and re-encodes it to WebP; image serializer fields should run uploads through it. Media storage is `STORAGES["default"]` in settings — Cloudflare R2 via `django-storages` when the `R2_*` env vars are set, local disk otherwise.
  - `email_backends.py` defines `FailoverEmailBackend`, the project's `EMAIL_BACKEND`: it walks `settings.EMAIL_BACKEND_CHAIN` (**Amazon SES via `django-ses` first, SendGrid as fallback**) and moves to the next provider when one raises or delivers nothing. The chain only contains providers whose credentials are set, so an environment with neither configured simply drops mail instead of erroring.
- **Custom user + auth.** `AUTH_USER_MODEL = users.User` (extends `AbstractUser`, email is the login identifier). JWT via `djangorestframework-simplejwt` stored in **HTTP-only cookies**, not localStorage. Custom views `CookieTokenObtainPairView` / `CookieTokenRefreshView` / `CookieTokenBlacklistView` manage the cookies; logout blacklists the token. Auth endpoints are rate-limited.
- **Members & roles.** `TripMember` (through model) gives users a role (ORGANIZER / CO_ORGANIZER / MEMBER) and status (PENDING / ACCEPTED / DECLINED / BLOCKED). Per-app permission classes (`IsTripAccessible`, `IsExpenseAccessible`, etc.) gate access by membership + role; public read is allowed only when the trip's `is_public` is set.
- **Presence & buddies.** `User` has `location`, `interests` (≤ 6 trimmed, case-insensitively deduped strings, validated in `users/serializers.py`) and `last_seen`. `users.authentication.LastSeenJWTAuthentication` (the project's `DEFAULT_AUTHENTICATION_CLASSES`) stamps `last_seen` via `User.touch_last_seen()` — a `.update()` at most once per 60 s per user; `is_online` = seen in the last 5 min. "Buddies" are users sharing a non-deleted trip as accepted members (owner counts); `users/services.py` (`get_buddies`, `are_buddies`) computes them in a fixed number of queries for `GET /api/auth/buddies/`.
- **Trip reviews.** `TripReview` (one per user per trip, rating 1–5) lives in `trips`, exposed as `TripViewSet` actions `/api/trips/<id>/reviews/` (GET list, POST upsert — not the owner, only public trips or accepted members) and `reviews/mine/` (DELETE). `TripViewSet._annotate()` adds `rating_avg` / `reviews_count` / `my_review` (plus `saves_count` / `is_saved`) as subquery annotations; reuse it when re-serializing a trip.
- **Direct messages (`messaging` app).** `Conversation` (exactly two users, stored canonically as `user_a < user_b`, unique per pair) and `Message` (`read_at`), routed at `/api/messages/` (`conversations/`, `conversations/<id>/messages/?after=`, `unread-count/`). Only participants see a conversation (others get 404); starting one requires being buddies. Fetching messages marks the other side's as read. The frontend polls, so these views use scoped throttles `messaging` / `messaging_send` instead of the global `user` rate.
- **Expense splitting.** `Expense` splits across members via the `ExpenseSplit` through model. Serializers validate that split amounts sum to the expense total; creation uses atomic transactions so a partial failure rolls back.
- **Sign in with Google.** `django-allauth` (socialaccount only — its own login/signup views are never routed, and `django.contrib.sites` is not used) verifies the Google identity the SPA posts to `/api/auth/google/`, as either a `code` (popup flow; the view redeems it at Google with `redirect_uri=postmessage`) or a `credential` ID token; `GoogleAuthView` then issues the project's usual JWT cookies. The Google app credentials come from env via `SOCIALACCOUNT_PROVIDERS`, not a DB `SocialApp`. A Google identity whose email already has an account is linked to it; otherwise a passwordless user is created.
- **Invitation flow.** Inviting an email with no account triggers a set-password email with a tokenized link (`/api/auth/set-password/<user_id>/<token>/`).

## Frontend v1 architecture

- **State via Context API**, one provider per domain: `AuthContext`, `TripsContext`, `TripContext`, `MembersContext`, `ItinerariesContext`, `ExpensesContext`, `ChecklistContext`, `PackingItemsContext`, `TagsContext` (in `src/contexts/`).
- **API access** goes through helpers in `src/lib/utils.js`, which set `axios.defaults.baseURL = VITE_BACKEND_URL` and `withCredentials = true` (required for the HTTP-only auth cookies). Use these helpers rather than calling axios directly.
- **Enums/labels mirroring backend choices** live in `src/configs/` — keep these in sync with backend `TextChoices` when changing domain enums.
- Routing uses `react-router-dom` with auth-aware protected routes.

## Frontend v2 architecture

Mirrors v1's domain model deliberately — port patterns from `frontend/` rather than inventing new ones.

- **Two component worlds.** `src/app/components/` holds the Figma-generated screens (`DesktopTrips`, `DesktopTripDetail`, `DesktopExplore`, `DesktopAIBuilder`, `Onboarding`, …) plus `components/ui/` (shadcn/Radix primitives); `src/components/layouts/` holds hand-written `AppShell` / `ProtectedLayout`. `src/pages/` holds hand-written auth pages. Figma-generated code also lives in `src/imports/` and uses a `figma:asset/*` import scheme resolved by a custom Vite plugin to `src/assets/`.
- **`src/app/App.tsx` is the wiring seam**: routes, and the provider nesting (`AuthProvider` → `TripsProvider` around the shell; the per-trip providers `TripProvider`/`MembersProvider`/`ItinerariesProvider`/`ExpensesProvider`/`ChecklistProvider`/`PackingItemsProvider` wrap only the trip-detail route). Small adapter components here bridge the generated screens' callback props (`onSave`, `onBack`, `onPlanIt`) to router navigation.
- **API layer is two-tiered**: `src/lib/api.ts` sets axios defaults (`baseURL`, `withCredentials`) and exposes bare `get/post/put/patch/deleteAPIData`; `src/hooks/useApi.ts` wraps them with **401 → `/auth/token/refresh/` → retry-once** logic. Contexts and screens should use `useApi`, not `lib/api` directly.
- **`src/lib/adapters.ts` maps backend payloads onto the Figma UI's shapes** (member display names/initials, deterministic per-member colors, destination-keyword cover images). New API integration usually means adding an adapter here rather than reshaping the generated components.
- **Google sign-in** lives in `src/components/auth/GoogleSignInButton.tsx` and `AuthContext.loginWithGoogle`. It uses the Google Identity Services **popup authorization-code** flow (`initCodeClient`) rather than Google's rendered button, so the trigger is a plain app `Button` that matches the rest of the UI; the returned code is posted to `/auth/google/`. It renders nothing unless `VITE_GOOGLE_CLIENT_ID` is set. Only v2 has this; `frontend/` is still password-only.
- **`src/config/index.ts`** mirrors backend `TextChoices` (trip/member/itinerary/checklist enums, split types, emoji icon maps) — the v2 equivalent of v1's `src/configs/`; keep both in sync with the backend.
- `@/…` resolves to `frontend-v2/src` (Vite alias). `frontend-v2/guidelines/Guidelines.md` is an unfilled Figma Make template — ignore it. `MODALS_TOASTS_DIALOGS.md` documents the v2 overlay conventions.

## CI/CD

- GitHub Actions (`.github/workflows/`) run backend and frontend (`frontend/`) tests on push/PR to `main`. v2 is not covered.
- Deployed on Render via `render.yaml` (backend uses `backend/build.sh` → installs deps, collectstatic, migrate; frontend builds `frontend/`).

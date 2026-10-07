# Jelajah agent guide

## Project map

- `backend/` is the Django REST Framework API and source of truth for data, permissions, and authentication.
- `frontend/` is the production React app deployed to `jelajah.raya.bio`.
- `frontend-v2/` is an in-progress redesign with real API wiring; it is not in production deploy or CI.
- `Trip` is the central domain object. It owns members and the itinerary, expenses, packing, and checklist data.

## Working rules

- Before changing a feature, trace its API, domain context, and UI together. Keep backend permissions and frontend role assumptions aligned.
- Preserve the existing domain boundaries. Put cross-domain behavior in shared infrastructure only when more than one domain owns it.
- In the frontends, follow the patterns already used in the target app. V1 API calls go through `frontend/src/lib/utils.js`; V2 calls go through `frontend-v2/src/hooks/useApi.ts` and use adapters for UI-specific data shapes.
- Keep mirrored enums and labels aligned with backend `TextChoices`: frontend v1 `src/configs/`, frontend v2 `src/config/index.ts`.
- Authentication uses JWT in HTTP-only cookies. Keep requests credentialed and preserve the existing refresh flow; do not move tokens into browser storage.
- Treat trip membership status and role checks as security boundaries. Enforce access in the backend, not only by hiding frontend controls.
- Keep changes scoped to the requested app/version. Do not assume the V2 redesign replaces production V1.

## Project references

- Read `CLAUDE.md` for the fuller architecture map, auth and email flows, deployment details, and development commands.
- Read the target app's README and nearby code before editing. Runtime scripts and config are authoritative for commands and dependencies.
- Backend domains are separate Django apps: `users`, `trips`, `itineraries`, `expenses`, `packing`, and `checklist`.

## Completion

- For behavior changes, update the owning layer and any directly affected frontend/backend contract.
- Run only checks relevant to the change and available in the target app; report what ran and any checks that remain unverified.
- Do not add or run tests unless the user asks for tests or verification.

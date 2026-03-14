# InsightFlow — Prioritized Development Roadmap

Generated from repository inspection. Grouped by area with **priority**, **impact**, **dependencies**, and **complexity** for each task.

---

## 1. Mobile app (app-gestor)

| # | Task | Priority | Impact | Dependencies | Complexity |
|---|------|----------|--------|--------------|------------|
| 1 | **Configurable API base URL** — Use `EXPO_PUBLIC_API_URL` (or build-time env) so `LOCAL_IP` is not hardcoded in `src/config/api.ts`. Enables staging/production and avoids code edits per device. | High | High | None | Low |
| 2 | **Auth on mobile** — Add login screen, store JWT (e.g. SecureStore), send `Authorization: Bearer` on API calls, and guard manager-only screens. Backend already has `/auth/login` and `requireAuth`. | High | High | Backend auth stable | Medium |
| 3 | **Perfil screen** — Replace placeholder with real profile: name, email, role, and logout (clear token + navigate to login). | High | Medium | Auth on mobile | Low |
| 4 | **Native date/time picker** — Replace free-text date/time inputs in CreateWorkoutScreen and CreateClassScreen with `@react-native-community/datetimepicker` (Expo-compatible) for better UX. | Medium | Medium | None | Low |
| 5 | **Remove TreinosScreen diagnostics** — Remove or gate `console.log` and on-screen API_URL/Health text used for debugging once stability is confirmed. | Medium | Low | None | Low |
| 6 | **Deep link / navigation params typing** — Centralize `RootStackParamList` in a single types file and use it across all stack screens for type-safe navigation. | Medium | Low | None | Low |
| 7 | **Offline / cache** — Cache workouts and classes locally (e.g. AsyncStorage or SQLite), show last data when offline, queue writes when back online. | Low | Medium | API stable | High |
| 8 | **Student app (Aluno)** — New app or flavor: login as ALUNO, view agenda (classes), my check-ins, my plan. Requires backend role-based routes and possibly separate app bundle. | Low | High | Auth, Box/tenant, API for aluno | High |

---

## 2. Backend

| # | Task | Priority | Impact | Dependencies | Complexity |
|---|------|----------|--------|--------------|------------|
| 1 | **Unify app entry and auth** — Single entry (e.g. `index.ts`) that mounts all routes. Apply `requireAuth` (or role-based auth) to `/api/workouts`, `/api/classes`, `/api/attendance`, `/api/users` so unauthenticated clients cannot mutate data. Today `index.ts` mounts these without auth. | High | High | None | Medium |
| 2 | **Box / tenant model** — Introduce `Box` model (id, name, slug, etc.) and scope `Workout`, `Class`, and analytics by `boxId`. Associate `User` with a Box (e.g. `user.boxId` or join table). Enables multi-tenant and removes hardcoded "superforce". | High | High | None | High |
| 3 | **Auth routes in main server** — Ensure `/auth/login`, `/auth/me`, and dev-token are available in the same process as `/api/*` (either use `index.ts` only or mount auth in `app.ts` and bootstrap from one entry). | High | High | Unify entry | Low |
| 4 | **Request validation** — Add Zod (or similar) validation for POST/PATCH bodies on workouts, classes, attendance, and auth to return 400 with clear messages. | Medium | Medium | None | Low |
| 5 | **Refresh token + httpOnly cookies** — Implement `/auth/refresh` and optional httpOnly cookie-based sessions for web dashboard; document impact on mobile (e.g. keep Bearer for app). | Medium | Medium | Auth stable | Medium |
| 6 | **Rate limiting** — Add rate limiting (e.g. per IP or per user) on auth and public endpoints to reduce abuse. | Medium | Low | None | Low |
| 7 | **Stripe webhooks and billing** — Already present in `app.ts` (webhooks, billing, pix, admin billing). Ensure webhook secret and idempotency are production-ready and covered by tests. | Medium | High | Stripe account | Medium |
| 8 | **API versioning** — Introduce `/api/v1/` (or similar) and document versioning policy for future breaking changes. | Low | Low | None | Low |

---

## 3. Analytics

| # | Task | Priority | Impact | Dependencies | Complexity |
|---|------|----------|--------|--------------|------------|
| 1 | **Churn risk / “last seen”** — Define “churn risk” (e.g. no check-in in last 14/30 days). Add analytics endpoint that returns members with last attendance date and a simple risk flag. Enables “Alunos em risco” in manager UI. | High | High | Attendance data | Medium |
| 2 | **Snapshot KPIs** — Store daily or weekly snapshots (e.g. totalCheckIns, occupancyPercent, memberCount per box/day) for trend charts and “vs last week” comparisons. | High | High | Box/tenant (optional) | Medium |
| 3 | **Filters on existing analytics** — Support optional `boxId` (when multi-tenant), `classId`, and `userId` on occupancy, heatmap, and ranking endpoints so managers can drill down. | Medium | Medium | Box model (for boxId) | Low |
| 4 | **Export reports** — Allow export of ranking, occupancy, or attendance as CSV (and optionally PDF) for downloads from web dashboard. | Medium | Medium | None | Medium |
| 5 | **Dashboard date range** — Use global DateRangePicker/PeriodSelector consistently on web; ensure all analytics cards respect the selected range (already partially done via PeriodContext). | Medium | Low | None | Low |
| 6 | **Assiduidade ranking from DB** — Replace stub in `GET /api/attendance/ranking` with real implementation (e.g. reuse analytics ranking or dedicated query) so web/mobile can show it. | Medium | Medium | None | Low |

---

## 4. Data model

| # | Task | Priority | Impact | Dependencies | Complexity |
|---|------|----------|--------|--------------|------------|
| 1 | **Box model and relations** — Add `Box`; add `boxId` to `User`, `Class` (and optionally to `Attendance` via Class). Migrate existing data (e.g. default box "superforce"). | High | High | None | High |
| 2 | **Subscription / User link** — Link `Subscription` and `Payment` to `User` (e.g. `userId`) and optionally to `Box` for per-box billing. | High | Medium | Box model | Medium |
| 3 | **Indexes for analytics** — Add DB indexes on `Attendance(attendedAt)`, `Attendance(userId, attendedAt)`, `Class(startAt)`, `Workout(boxId, date)` to speed up analytics and list endpoints. | High | Medium | None | Low |
| 4 | **Unique constraint attendance** — Prevent duplicate (userId, classId) in `Attendance` (unique index or application check). POST already de-dupes; constraint guarantees integrity. | Medium | Low | None | Low |
| 5 | **Soft delete (optional)** — Add `deletedAt` to `Class` and `Workout` for soft delete and “restore”; filter deleted by default in all reads. | Low | Low | None | Medium |

---

## 5. Developer experience

| # | Task | Priority | Impact | Dependencies | Complexity |
|---|------|----------|--------|--------------|------------|
| 1 | **Env and runbooks** — Add or update `.env.example` in backend and app-gestor (DATABASE_URL, JWT_SECRET, PORT, EXPO_PUBLIC_API_URL). Document `./dev-check.sh` and “first run” steps in README. | High | High | None | Low |
| 2 | **Monorepo scripts** — Root `package.json` scripts to run backend + web dashboard (and optionally mobile) together (e.g. `npm run dev`, `npm run dev:all`). | High | Medium | None | Low |
| 3 | **CI pipeline** — On PR: install deps, lint, typecheck, run backend tests (Vitest), run Prisma generate/migrate (or deploy). Optionally build web and app-gestor. | High | High | None | Medium |
| 4 | **OpenAPI coverage** — Ensure all public API routes used by web and mobile are documented in Swagger/OpenAPI (app.ts has `/docs`; index.ts may expose different routes). Align entry and docs. | Medium | Medium | Unify backend entry | Low |
| 5 | **E2E or integration tests** — Add a few E2E tests (e.g. Playwright for web or Detox for mobile) for critical flows: login, list workouts, create class, mark attendance. | Medium | High | Auth, stable API | High |
| 6 | **Prisma seed stability** — Seed is already rich; ensure it is idempotent and documented (`npm run db:seed`). Add note about clearing data for local dev. | Medium | Low | None | Low |
| 7 | **Docker Compose for full stack** — Optional: add backend (and optionally Postgres) to Docker Compose so `docker compose up` gives DB + API for local dev. | Low | Medium | None | Medium |

---

## Suggested implementation order (high level)

1. **Backend:** Unify entry + auth on API routes; add Box model and scope.
2. **Backend / DX:** `.env.example`, README, dev-check, CI.
3. **Mobile:** Configurable API URL; then auth (login + token); then Perfil (logout).
4. **Analytics:** Churn/last-seen endpoint; then snapshot KPIs; then filters.
5. **Data model:** Indexes and attendance unique constraint; then Subscription/User link.
6. **Mobile:** Native date picker, remove diagnostics, param list typing.
7. **Analytics:** Export and attendance ranking from DB.
8. **Later:** Student app, offline cache, refresh tokens, rate limiting, soft delete, full E2E.

---

## Reference: current state (from repo)

- **Backend:** Express in `index.ts` (workouts, classes, users, attendance, analytics, health). Separate `app.ts` with auth, Stripe, Swagger, requireAuth on some routes. Two entry points.
- **Web:** Vite + React + Tailwind in `apps/gestor-dashboard`; PeriodContext; ManagerSummaryCard, OccupancyHeatmap, MemberRankingCard, OcupacaoPorDiaCard, HeatmapSemanaHoraCard, RankingAssiduidadeCard; TreinosPage; DevLogin.
- **Mobile:** Expo app in `apps/gestor-dashboard/app-gestor`; tabs Home, Treinos, Aulas, Perfil; full workout CRUD; class CRUD; class attendance (toggle); Home with summary, alerts, insights, ranking, heatmap. No auth; API_URL from hardcoded LOCAL_IP.
- **Schema:** User, Class, Attendance, Workout (boxId string), Payment, Subscription; no Box model; Workout/Class not scoped by tenant.
- **DX:** `dev-check.sh`; backend Vitest; Prisma seed; README with basic run instructions.

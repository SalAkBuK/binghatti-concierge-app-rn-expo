# 📱 Mobile Frontend Plan — Admin Dashboard (React Native + Expo + TypeScript)

> NOTE: Tenant screens are already implemented and running on `mockData.ts`. This plan assumes tenant flows exist and focuses on building the **Admin dashboard** and reusable infra so both tenant and admin share the same app.

## ⚡ Context

- App: Single React Native (Expo) app, TypeScript.
- Current status: Tenant screens implemented with mock data.
- Goal (next): Implement Admin dashboard (Users, Buildings, Jobs, Analytics, Permissions) using mock data and reusable components. Keep everything swap-ready for backend APIs later.

---

## 🎯 High-level recommendation

**Build the Admin portal next (admin_first)** while keeping tenant screens intact and reusing components. This lets you stabilize server-side models (in future) and produce admin UI that manages jobs, buildings, and users — essential for realistic tenant data display.

**Rationale**

- Admin controls (jobs assignment, building setup) are needed for tenant flows to show real data later.
- Building admin UI now uncovers missing domain models (DB/endpoint shapes) so API contracts are ready.
- Tenant screens remain usable with mocks; you can demo progress while admin is built.

---

## 🔁 Reuse & integration strategy

- Reuse existing tenant components where possible (Form fields, FileUploader, EntityTable, Toasts).
- Create generic components (EntityTable, EntityForm, JobCard, UserCard) parameterized by props so both tenant and admin use them.
- Add a switchable service layer (`adminApi.ts`, `tenantApi.ts`) with `USE_MOCK` flag to flip to HTTP later.
- Keep checkpoint files small if using agents for delegation.

---

## ♻️ Reusable component list (priority)

1. `EntityTable` — paginated list for Users, Buildings, Jobs. (Already used by tenant lists; reuse.)
2. `EntityForm` / `ModalForm` — create/edit users, buildings.
3. `JobCard` — job summary + status + attachments.
4. `FileUploader` — mocked upload for attachments.
5. `PermissionsEditor` — grid/toggles to assign roles/permissions.
6. `AnalyticsTile` / `ChartContainer` — show mock KPIs.
7. `ConfirmDialog` / `Toast` — shared UX for destructive actions.

---

## 🧭 Admin screens (MVP)

- **Admin Dashboard (Home)** — key KPIs (open jobs, tenants count, bookings today).
- **Users List & Create** — list, search, create user modal (UserForm).
- **Buildings List & Create** — link buildings to managers.
- **Jobs List** — filterable list of jobs, quick assign/update status.
- **Job Detail** — attachments, notes, update status (with mock attachments).
- **Permissions Editor** — set role-permissions (mocked).
- **Analytics** — simple charts and stat tiles using `analytics` mock.
- **Notifications** — mock notification management UI.

Each screen should consume `adminApi` (mock) and reuse tenant components where applicable.

---

## 🔨 Prioritized task backlog (frontend-only, mocks)

1. **Scaffold AdminStack & routing** (Auth guard + role switch). — _small_
2. **Users screen** (EntityTable + UserForm). — _small_
3. **Buildings screen** (EntityTable + Create modal). — _small_
4. **Jobs list & detail** (with JobCard and status update). — _medium_
5. **Permissions Editor** (grid of toggles). — _medium_
6. **Analytics Dashboard** (mock KPIs + small charts). — _medium_
7. **Notifications management UI**. — _small_
8. **Polish, tests, and UX** (accessibility + edge states). — _small_

---

## 🔁 Mock → Real API transition plan (short)

1. Define minimal API contracts first (POST/GET/PUT endpoints for users, buildings, jobs).
2. Implement mock server that matches contract (json-server/Express). Tenant flows can be pointed to same mock server.
3. Replace `USE_MOCK` flag in `adminApi`/`tenantApi` to `{http:false}` → `true` in steps. Smoke-test each screen.
4. Implement auth & RBAC hooks when backend provides JWTs.

---

## ✅ What to pass to Claude (if you want automated planning)

Paste this file plus the sentence:

> "Tenant screens already implemented and using `mockData.ts`. Produce the Admin dashboard plan, component props, API contract samples, and a prioritized backlog for frontend-only work with mock data. Return JSON following schema: { summary, reusable_components, ui_screens, api_contracts, backlog, dev_notes }"

This instructs Claude to account for existing frontend work and generate machine-readable output.

---

## 🧪 Acceptance criteria (example)

**Users screen**

- Admin can view paginated list (25 items).
- Admin can open Create User modal and create user (mock) and it appears in list.
- Role field present and editable.

**Jobs detail**

- Shows attachments (use mock URLs), notes, and status.
- Admin can change status and list updates accordingly.

**Analytics**

- Shows mock KPIs from `analytics` mock object. Charts render without network calls.

---

## ⚙️ Quick dev notes & tips

- Keep `mockData` realistic: IDs, timestamps, status values.
- Use `react-query` for cache + background refresh behavior (even in mock).
- Lazy-load AdminStack (`React.lazy`) to keep tenant startup light.
- Use `USE_MOCK` env flag to make switching trivial.
- Keep component props explicit and typed; this makes swapping data sources trivial.

---

## ✉️ Deliverables for the next sprint (frontend-only)

- AdminStack wired into navigation.
- Users screen + Create User modal.
- Buildings screen.
- Jobs list + Job detail (status updates).
- Analytics tiles.
- `adminApi.ts` (mock implementation).
- Unit tests for EntityTable and UserForm.

---

## 📌 Final note

Tenant screens are preserved. Build the Admin dashboard next with mocks, reuse tenant components, and follow the mock→mock-server→real-api transition plan above so swapping to backend later is painless.

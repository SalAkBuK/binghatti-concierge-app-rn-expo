# ADMIN_FRONTEND_MISSING_SCREENS.md

**Scope:** Admin-only UI. Frontend mocks first; later wire to backend.

**Stack assumptions:** React (or RN Web), TypeScript, React Router, React Query, Tailwind/shadcn (or existing design system), MSW for mocks, RTL for tests.

---

## Table of contents

1. Billing & Meter Readings (Admin)
2. Maintenance Scheduler (Admin)
3. Broadcast Notifications (Admin)
4. Optional Portfolio Oversight (Visitors, Parcels)
5. Shared UI/Mocking/Testing Notes

---

## 1) Billing & Meter Readings (Admin)

**Why:** The PDF calls out Building Billing and Lootah Gas Readings (tenant submits photo + reading). Admin needs a portfolio-level view and verification workflow.

### Route

- `/app/(admin)/billing`

### Goals (Admin)

- Portfolio view of bills & meter reads across all buildings
- Verify/approve tenant-submitted readings (photo + numeric value)
- Export billing CSV for finance ops (UI-only export of table rows)

### Screens & Components

- `BillingDashboard`

  - KPI tiles: Pending verifications, Approved this month, Rejections, Total billed
  - Building filter (multi-select), month picker

- `MeterReadingsTable`

  - Columns: Date, Building, Unit, Tenant, Reading, Photo, Status (pending/approved/rejected), Reviewer
  - Row actions: **Review** (opens modal), **Approve**, **Reject**

- `ReadingReviewModal`

  - Photo viewer (zoom), numeric input, comment box, approve/reject buttons

- `BillsTable`

  - Columns: Period, Building, Units billed, Total amount, Status (draft/issued/paid), Export
  - Actions: **Generate Draft Bill** (UI-only), **Export CSV**

### Types (frontend)

```ts
type ID = string;
type ISODate = string;

export interface MeterReading {
  id: ID;
  buildingId: ID;
  buildingName: string;
  unitNumber: string;
  tenantName: string;
  photoUrl: string;
  value: number | null; // parsed from tenant input
  submittedAt: ISODate;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: ISODate;
  notes?: string;
}

export interface BillSummary {
  id: ID;
  period: string; // "2025-11"
  buildingId: ID;
  buildingName: string;
  unitsBilled: number;
  totalAmount: number;
  status: "draft" | "issued" | "paid";
  createdAt: ISODate;
}
```

### React Query (stubs)

- `useQuery(['admin','meter-readings', {period, buildings}])`
- `useMutation(approveReading)` / `useMutation(rejectReading)` (optimistic)
- `useQuery(['admin','bills', {period, buildings}])`
- `useMutation(generateDraftBill)`

### UX specifics

- Bulk approve (multi-select rows) with confirmation
- Reject requires note
- Export buttons generate CSV client-side from table rows

### Edge cases

- Blurry photo → keep status pending, ask re-submit (UI shows “request new photo”)
- Duplicate reading same period/unit → warning banner on row

---

## 2) Maintenance Scheduler (Admin)

**Why:** The PDF includes maintenance scheduling and notifying tenants; Admin needs a portfolio-level planner.

### Route

- `/app/(admin)/maintenance`

### Goals (Admin)

- Plan preventive maintenance across buildings (title, description, date/time, affected scope)
- Track status (upcoming/completed/cancelled)
- (UI-only) Offer a **“Notify tenants”** toggle that would call notifications later

### Screens & Components

- `MaintenanceCalendar` (month/week views, building filter)
- `MaintenanceList` (tabs: Upcoming / Completed / Cancelled)
- `MaintenanceFormModal` (create/edit schedule)
- `ImpactPreview` (estimated affected units count by building)

### Types (frontend)

```ts
export interface MaintenanceEvent {
  id: ID;
  buildingId: ID;
  buildingName: string;
  title: string;
  description?: string;
  startAt: ISODate;
  endAt: ISODate;
  status: "upcoming" | "completed" | "cancelled";
  notifyTenants: boolean;
  createdAt: ISODate;
}
```

### React Query (stubs)

- `useQuery(['admin','maintenance', {range, buildings}])`
- `useMutation(createEvent)` / `useMutation(updateEvent)` / `useMutation(cancelEvent)`

### UX specifics

- When `notifyTenants` checked, show a **message template** preview (subject + body)
- Conflict warning if another event overlaps same building/time
- Quick-create from calendar cell (defaults 09:00–12:00)

### Edge cases

- Reschedule an event already marked “upcoming” with notify on → modal asks “Send update notice?”
- Convert event to “completed” auto-sets `endAt = now` (confirm dialog)

---

## 3) Broadcast Notifications (Admin)

**Why:** Admin can send notices; current Admin UI only views notifications, not send.

### Route

- `/app/(admin)/notifications/broadcast`

### Goals (Admin)

- Compose and send announcements to all tenants in selected buildings
- Support quick templates (maintenance, safety, billing reminders)
- Queue/send now (UI-only), preview before sending

### Screen & Components

- `BroadcastForm`

  - Fields: Buildings (multi), Title, Message, Type (info/success/warning/error)
  - Template picker (dropdown → prefill Title/Message)
  - Preview card (live)

- `SentAnnouncementsList` (mock history for demos)

### Types (frontend)

```ts
export interface AnnouncementDraft {
  id: ID;
  buildingIds: ID[];
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: ISODate;
  sentAt?: ISODate;
}
```

### React Query (stubs)

- `useMutation(sendAnnouncement)` → push to `sentDrafts` mock store
- `useQuery(['admin','announcements'])` (mock history)

### UX specifics

- Character counter for title/message
- Unsafe content guard (very simple client-side rules)
- Toast confirms “queued” (mock)

### Edge cases

- No building selected → disable submit
- Very long message → soft limit warning, still allow

---

## 4) Optional Portfolio Oversight (Admin)

> The PDF highlights Visitors and Parcels/Delivery. In your Admin UI, logs appear inside Building details; adding portfolio-wide Admin views is optional but useful.

**Visitors (Admin-wide)**

- Route: `/app/(admin)/visitors`
- Table with status (expected/arrived/departed), filters by building & date
- Action: mark arrived/departed (UI-only)

**Parcels (Admin-wide)**

- Route: `/app/(admin)/parcels`
- Table with building, unit, courier, status (pending/picked_up/lost)
- Actions: mark picked up (UI-only), CSV import for bulk records

(Keep both behind a feature flag if you want to ship core first.)

---

## 5) Shared UI / Mocking / Testing Notes

- **Design system:** Reuse `AnalyticsTile`, `EntityTable`, and modal/dialog primitives already used across Admin.
- **Mocking (MSW):** Handlers that mirror eventual endpoints:

  - `GET /admin/billing/readings`, `POST /admin/billing/readings/:id/approve`
  - `GET /admin/billing/bills`, `POST /admin/billing/bills/draft`
  - `GET /admin/maintenance`, `POST /admin/maintenance`, `PUT /admin/maintenance/:id`
  - `POST /admin/announcements`, `GET /admin/announcements`

- **State:** React Query cache keys as listed; co-locate feature stores only for UI state (filters, selection).
- **Testing (RTL):**

  - Billing: approve/reject flow updates table row state
  - Maintenance: create & reschedule updates calendar and list
  - Broadcast: validation (no building → disabled), preview renders correctly

- **Accessibility:** Focus traps in modals, ARIA labels on tables and calendar controls, keyboard shortcuts for approve/reject (`A`/`R` on focused row).

---

## Deliverables checklist (Admin-only)

- [ ] `/billing` with MeterReadingsTable + BillsTable (approve/reject, export)
- [ ] `/maintenance` with MaintenanceCalendar + list + form + notify toggle
- [ ] `/notifications/broadcast` with template picker + preview + mock history
- [ ] (Optional) `/visitors` portfolio view
- [ ] (Optional) `/parcels` portfolio view
- [ ] MSW handlers + storybook states (empty/loading/error/data)
- [ ] RTL tests for critical actions

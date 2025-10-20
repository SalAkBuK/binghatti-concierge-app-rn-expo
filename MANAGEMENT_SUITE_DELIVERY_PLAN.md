# Management Suite Delivery Plan

_Last updated: 7 October 2025_

This document inventories the work required to turn the management route group (`app/(management)`) into a first-class, admin-independent experience. It captures data/model gaps, service-layer changes, mock data needs, and navigation tasks, so implementation can proceed in discrete phases.

---

## 1. Data & Service Layer Requirements

### 1.1 Building, Unit & Lease Domain
- **Add lease records** tying tenants to units with fields such as `leaseId`, `unitId`, `tenantId`, `startDate`, `endDate`, `rentAmount`, `status`, and optional attachments (contracts, compliance docs).
- **Extend `BuildingUnit`** (`lib/types/index.ts`) with:
  - `templateId` linking back to `UnitType`
  - `bedrooms`, `bathrooms`, `areaSqFt`
  - `photos: string[]`
  - `offlineReason` when status is maintenance/renovation
- **Services/Context updates**:
  - `createUnit(buildingId, templateId, overrides)` – clones an admin-defined template.
  - `deleteUnit(unitId)` – soft delete/offline toggle.
  - `reassignUnit(unitId, updates)` – floor/stack changes, amenity overrides.
  - Lease helpers: `getLeasesByBuilding`, `createLease`, `updateLeaseStatus`, `terminateLease`.

### 1.2 Workforce & Service Providers
- **Expand `BuildingEmployee`** with `permissions: string[]`, `contractStart`, `contractEnd`, `certifications: string[]`, `shiftSchedule` (structure for rotating shifts).
- **Extend `ServiceProviderProfile`** with `contractId`, `complianceStatus`, `documents`, `assignedBuildingIds`.
- **Services/Context updates**:
  - Workforce: `setEmployeePermissions`, `scheduleShift`, `recordTraining`.
  - Providers: `linkProviderToBuilding`, `unlinkProvider`, `updateProviderContract`, `logComplianceCheck`.
  - New type `ServiceContract` with helpers to fetch/update by provider or building.

### 1.3 Requests, Jobs & Messaging
- **Request enhancements**:
  - Server and context support for internal notes (`POST /requests/{id}/notes`) and tenant/provider messaging threads (`messages[]`).
  - SLA metadata: `slaDueAt`, `lastEscalatedAt`.
  - Audit trail events exposed via `GET /requests/{id}/timeline`.
- **Job workflow**:
  - Bulk status updates and assignment queue.
  - Attach cost breakdowns and compliance checklists.

### 1.4 Visitors, Deliveries & Activity
- **Introduce `VisitorPass` / `DeliveryPass`** records with approval status, QR code, check-in/out timestamps, host contact, and optional parking assignment.
- **Context actions**: `approveVisitor`, `rejectVisitor`, `markArrival`, `markDeparture`, `scheduleDeliveryWindow`.
- **Activity stream**: filterable feed API (`GET /activity?buildingId=...`) returning normalized `type`, `entityId`, `message`, `timestamp`, `severity`, `acknowledged`.
- **Notifications**: new mutation `acknowledgeNotification(id)` plus building-scoped broadcasts.

### 1.5 Amenities & Ratings
- **Create `BuildingAmenityConfig`** entity with booking windows, capacity rules, blackout dates, maintenance status, media assets, and terms.
- **Actions**: `createAmenity`, `updateAmenityRules`, `archiveAmenity`, `scheduleAmenityMaintenance`.
- **Ratings**:
  - Extend `RatingSummary` to include time-series metrics, NPS-style scores.
  - Provide `getRatingsByEntity(entityId)` and `respondToRating` for internal follow-up.

### 1.6 API Surface
- Document new endpoints mirroring the above actions (`/leases`, `/units`, `/providers`, `/visitor-passes`, `/amenities`, `/activity`, etc.).
- Ensure responses align with existing TypeScript interfaces or update typings accordingly.

---

## 2. Mock Data & Fixtures

To keep screens functional pre-backend, extend `lib/utils/mockData.ts` with:

1. **Lease fixtures** per building/unit with varying statuses (active, expiring, terminated).
2. **Enhanced unit catalog** including templates, amenity overrides, and photos (placeholder URLs).
3. **Staff roster** covering different roles/shifts plus permission sets.
4. **Provider contracts** with compliance states and expiry dates.
5. **Visitor/delivery logs** incorporating approvals, denials, and timestamps.
6. **Amenity configs** (pool/gym with booking windows, blackout schedules).
7. **Rating trails** for both providers and employees with summaries.
8. **Activity feed entries** covering request escalations, contract expiring alerts, maintenance notices.

Mock actions should simulate latency and optimistic updates, mirroring the final API behaviour.

---

## 3. Navigation & Screen Work

### 3.1 Route Structure
- Replace current re-exported admin screens under `app/(management)` with dedicated management components. Shared UI should live in `components/management/` or reusable primitives in `components/common/`.
- Add any supporting modals in `app/(modals)` (e.g., `management-lease-detail`, `management-amenity-editor`, `management-provider-contract`).
- Update `components/ui/SideMenu.tsx` to highlight the enhanced management routes (already partially done, ensure new screens are wired once built).

### 3.2 Screen-Specific Tasks
| Screen | Key Additions | Dependencies |
| ------ | ------------- | ------------ |
| `/(management)/index` | Alert cards, compliance feed, drill-down filters | `getManagementAlerts`, activity API |
| `/(management)/tenants` | Lease panel, contact log, bulk actions | Lease data, messaging API |
| `/(management)/requests` | Notes, messaging drawer, SLA timers | Request timeline API, chat service |
| `/(management)/units` | Template instantiation, gallery, bulk ops | Unit create/delete, media handler |
| `/(management)/buildings` | Amenity management tab, visitor/delivery dashboards | Amenity config actions, visitor APIs |
| `/(management)/workforce` | Permission matrix, shift calendar, training log | Workforce service extensions |
| `/(management)/jobs` | Contract view, compliance checklist, bulk assign | Provider contracts, checklist API |
| `/(management)/activity` | Filters (type/severity/building), acknowledgements | Activity feed API |
| New `/(management)/visitors` | Approval workflow, QR code display, delivery scheduling | ✅ Visitor pass mock + approval/check-in actions |
| New `/(management)/amenities` | Rule editor, maintenance scheduling | ✅ Config dataset + update action |
| New `/(management)/ratings` | Provider/employee rating dashboards | Ratings drill-down |

---

## 4. Implementation Phases

1. **Data Foundations** – Update types/mock data and context services to support leases, units CRUD, provider contracts, amenities, visitors, and activity feeds. _(Leases, amenity configs, visitor passes completed)_
2. **Screen Refactor** – Replace admin re-exports with management-specific components, introducing new screens/modals as required.
3. **Interaction Enhancements** – Layer in messaging, notes, bulk actions, and scheduling once data hooks exist.
4. **Polish & QA** – Align UI with design (charts, badges, alert styling) and add targeted tests for the new actions/context helpers.

---

## 5. Open Questions
- Do leases live in a separate service, or should they piggyback on building/tenant endpoints?
- Should amenities be scoped per building or share a global catalog with overrides?
- How granular should permissions be for building staff (per-feature toggles vs. role bundles)?
- Delivery management: integrate with external courier APIs or keep manual?
- Messaging: reuse existing notification infrastructure or integrate a chat service?

Clarifying these items will ensure the backend contracts and UI flows stay aligned before implementation begins.

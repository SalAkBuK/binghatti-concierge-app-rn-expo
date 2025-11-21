# Tenant Role Deep Dive

## Overview
- The tenant experience (`app/(tenant)/`) gives residents self-service access to building notices, maintenance requests, amenities, visitors, and personal profile details.
- Tenants only see data tied to their unit. Every list is filtered by `tenantId === currentUser?.id`, and request/visitor/booking creation pre-fills apartment, tower, and building context from `currentUser.profile`.
- The flow emphasizes quick actions (new request, view requests) and polished visuals (gradient welcome card, animated buttons, skeleton loaders) for a mobile-first feel.

## Access Model & Navigation
- **Route group:** `app/(tenant)/`
- **Role identifier:** `tenant`
- **Tabs:** Defined in `_layout.tsx`. The bottom bar exposes `Home`, `Requests`, `New`, and `Profile`. Additional modules (`amenities`, `visitors`, `my-bookings`, `my-ratings`) are hidden from the tab bar and reached through the drawer or in-app navigation.
- **Side menu:** `components/ui/SideMenu.tsx` adjusts its menu items per role. For tenants, it links to bookings, visitors, amenities, ratings, and logout.
- **Modals:** Requests and notices deep-link into modal routes under `app/(modals)/`, e.g., `/request-details`, `/notice-details`, `/amenity-booking-form`, `/register-visitor`.

## Shared UI & State Patterns
- `HeaderBar` handles notification badges and toggles the side menu; tenant screens typically set `showTitle` or pass a subtitle for context.
- Loading states rely on skeletons such as `HomeScreenSkeleton` and `RequestsScreenSkeleton` while mock data hydrates.
- `AnimatedButton` and `react-native-reanimated` (`FadeIn`, `FadeInDown`) deliver consistent animations across cards and lists.
- All data/mutations flow through `useApp()` (`lib/context/connected-app-provider.tsx`). The provider currently serves mock data but exposes the same methods planned for API integration.
- Notifications use `filterNotificationsByUser` so badge counts reflect the tenant’s unread alerts.

## Data & Actions (`useApp`)
- **Requests:** `requests`, `createRequest(dto)`, `setSelectedRequest`, `reviewJobEstimateAsTenant`, `cancelRequest?` (not implemented), `jobs` for linked work orders.
- **Notices:** `notices`, `setSelectedNotice`.
- **Bookings & amenities:** `getBookings()`, `cancelBooking(id, reason)`, `amenities`, `actions.getAmenityById?` (drives booking modal), `actions.getManagedBuildingIds` for scoping.
- **Visitors:** `getVisitors()`, `registerVisitor`, `cancelVisitor`.
- **Ratings:** `getRatings()`, `actions.submitRating` (from other flows), `actions.getRatingByRequestId`.
- **Profile:** `updateUser(email, updatedUser)`. Note: this updates local state only; backend sync not yet wired.

## Screen Breakdown

### Home (`app/(tenant)/index.tsx`)
- Guards unauthenticated users by redirecting to `/auth`.
- Gradient welcome card reads building/apartment data from `currentUser.profile`.
- Quick action buttons route to `new-request` and `requests`.
- Building notices list shows the first two scheduled/in-progress notices and opens the notice detail modal.
- Recent activity lists the three most recent requests for the tenant with status badges; selecting a request opens `/request-details`.
- Outstanding tasks: connect to backend notices/requests, replace hard-coded building text, and support “View all notices” navigation.

### Requests (`app/(tenant)/requests.tsx`)
- Displays totals (total, completed, in progress, pending) calculated from tenant-filtered requests.
- Request list cards include status, priority, description snippet, timestamp, and optional estimate/approval status pulled from `jobs`.
- Tenants can approve/decline job estimates and mark completion approvals via context helpers.
- Outstanding tasks: introduce pagination/infinite scroll, add search/filter persistence, surface attachments, and wire refresh to real API calls.

### New Request (`app/(tenant)/new-request.tsx`)
- Form collects type, title, description, priority, location details, contact phone, preferred time, and additional notes.
- `AttachmentPicker` supports image uploads; submitted attachment URIs are stored alongside the request (local only).
- Validation enforces minimum title/description lengths and required fields before calling `actions.createRequest`.
- Success resets the form and navigates back to home.
- Outstanding tasks: connect to backend, upload files to storage, and add success screen with request reference/ETA.

### Amenities (`app/(tenant)/amenities.tsx`)
- Filter chips (All, Pool, Gym, Sauna, BBQ) scope the amenity list. When arrived via More menu or filter param, initial filter is set from route params.
- Amenity cards show status (maintenance badge), capacity, booking rules, and navigate to the booking modal unless the amenity is offline.
- Outstanding tasks: fetch availability slots, surface booking costs, and expose policy docs per amenity.

### My Bookings (`app/(tenant)/my-bookings.tsx`)
- Uses `actions.getBookings()` to load bookings, then categorizes them into upcoming, past, and cancelled buckets.
- Filter pills switch between categories; each booking card shows amenity, schedule, status, and guests.
- Tenants can cancel upcoming bookings via `actions.cancelBooking` with a confirmation prompt.
- Outstanding tasks: fetch bookings from backend, show QR codes/passcodes, and send calendar invites or share links.

### Visitors (`app/(tenant)/visitors.tsx`)
- Statistics track total, expected, arrived, departed, and cancelled visitors scoped to the tenant.
- Filter tabs (All, Expected, Arrived, etc.) plus a search box refine the visitor list by status or name/phone.
- Cards display visitor codes, ID details, purpose, schedule, and allow cancellation for pending visits.
- “Register Visitor” opens the modal form in `/register-visitor`.
- Outstanding tasks: integrate with backend pass system, display QR codes and barcode images, and add ability to share passes via SMS/email.

### My Ratings (`app/(tenant)/my-ratings.tsx`)
- Aggregates ratings submitted by the tenant. Cards show link to request, provider, star rating, review snippet, provider response, and attachment count.
- Selecting a rating opens a detail modal; attachments can be previewed via `ImageViewer`.
- Outstanding tasks: show provider names, allow editing/deleting ratings within a grace period, and add filtering by rating value or service provider.

### Profile (`app/(tenant)/profile.tsx`)
- Displays editable fields for name, email, phone, apartment, tower, and emergency contacts.
- Edit mode toggles text inputs; basic validation ensures valid email/phone before calling `actions.updateUser`.
- Includes logout shortcut (duplicates the SideMenu action).
- Outstanding tasks: persist changes via API, support avatar upload, and expose password/security settings in a dedicated modal.

### Side Menu & Drawer Navigation
- Tenant drawer lists Home, Requests, Bookings, Visitors, Amenities, Ratings, Profile, and Sign Out.
- Logout flows route through `actions.logout()` and redirect to `/auth`.
- Outstanding tasks: respect feature flagging (e.g., hide Ratings if disabled) and add tenant support links/document downloads.

## Permissions & Safeguards
- Tenants can only access data where `tenantId` matches their user id. Context selectors (requests, visitors, ratings) enforce this in the UI.
- Create/update actions automatically inject the tenant’s building/apartment/tower IDs, preventing cross-unit submissions.
- Critical actions (cancelling bookings/visitors, approving estimates) request confirmation via alerts to avoid accidental taps.

## Next Steps
1. Replace mock context data with real tenant endpoints (requests, notices, amenities, bookings, visitors, ratings, profile).
2. Implement attachment uploads for requests and ratings, including progress feedback and retry handling.
3. Add analytics/telemetry hooks (e.g., request submission success/failure, booking cancellations) for product insight.
4. Expand testing: write React Native Testing Library coverage for home dashboard, request flow, and booking cancellation to guard against regressions.
5. Localize strings and formatters (dates, currency) to support regional deployments.

## Related Resources
- Context & actions: `lib/context/connected-app-provider.tsx`
- Shared UI components: `components/ui/`, `components/icons/`
- Mock data definitions: `lib/utils/mockData.ts`
- Tenant modal flows: `app/(modals)/request-details.tsx`, `notice-details.tsx`, `amenity-booking-form.tsx`, `register-visitor.tsx`

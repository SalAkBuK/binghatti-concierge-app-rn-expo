## Align Owner Request Flow With Backend Portfolio APIs

### Summary
Bring the owner maintenance request experience in line with the current backend owner-scope flow. Keep the owner surface limited to list, detail, comments, and approve/reject when `ownerApproval.status === 'PENDING'`. Do not add management, provider, estimate-submission, assignment, or status-progression controls.

### Implementation Changes
- **Owner request detail**
  - Expand [request detail](C:/Users/saleh/Documents/Towerdesk%20Mobile/binghatti-concierge-app-rn-expo/app/(owner)/requests/[requestId].tsx) to render the full backend-backed request shape:
    - request basics: title, description, building, unit, status, priority, type
    - actors: `createdBy`, `assignedTo`
    - attachments: visible and openable when present
    - approval block: `ownerApproval.status`, `requestedAt`, `requestedByUserId`, `deadlineAt`, `decidedAt`, `decidedByOwnerUserId`, `reason`, `requiredReason`, `estimatedAmount`, `estimatedCurrency`, `decisionSource`, `overrideReason`, `overriddenByUserId`
  - Keep decision buttons visible only when resolved approval status is exactly `PENDING`.
  - Keep approve using optional `approvalReason`; keep reject requiring non-empty `approvalReason`.
  - After approve/reject, reload detail so the approval state updates and buttons disappear automatically.
  - When approval is `APPROVED`, `REJECTED`, or `NOT_REQUIRED`, show status-only approval UI with no CTA.

- **Owner request list**
  - Keep [request list](C:/Users/saleh/Documents/Towerdesk%20Mobile/binghatti-concierge-app-rn-expo/app/(owner)/requests/index.tsx) backed by `GET /owner/portfolio/requests`.
  - Preserve current owner-scope behavior: only render what the backend returns.
  - Continue using resolved nested approval state for badges/filtering; do not infer actionability from notifications.
  - Keep the list as navigation-only; no inline approve/reject controls.

- **Notifications and deep linking**
  - Unify request/conversation target extraction between [owner notifications screen](C:/Users/saleh/Documents/Towerdesk%20Mobile/binghatti-concierge-app-rn-expo/app/(owner)/notifications.tsx) and [owner notifications context](C:/Users/saleh/Documents/Towerdesk%20Mobile/binghatti-concierge-app-rn-expo/lib/context/owner-notifications-context.tsx).
  - Support both flat and nested payload forms for request navigation:
    - `data.requestId`
    - `data.data.requestId`
    - same normalization for conversation IDs if applicable
  - Notifications should only navigate to the request detail; the detail response decides whether approval is still actionable.
  - If the request is out of scope and returns `404`, show a friendly “request no longer available / outside current owner scope” state instead of a generic failure.

- **API/types usage**
  - Keep using existing owner API methods in `ownerPortalApi` for list, detail, comments, unread counts, approve, reject, and notifications.
  - Do not add or change backend endpoints.
  - Use the existing `OwnerPortfolioRequest` and nested `OwnerApprovalSnapshot` shape as the source of truth, with null-safe fallbacks for optional fields.

### Test Plan
- Request list loads from owner portfolio requests and shows only backend-returned in-scope items.
- Request detail loads request + comments successfully for an in-scope request.
- Approval CTA is shown only when `ownerApproval.status === 'PENDING'`.
- Approval CTA is hidden for `NOT_REQUIRED`, `APPROVED`, and `REJECTED`.
- Approve works with empty or filled approval reason.
- Reject is blocked client-side until a reason is entered.
- After approve/reject, detail refreshes and buttons disappear.
- Comments can be listed and posted from owner request detail.
- Request notifications open the correct request when payload uses either flat or nested `requestId`.
- Out-of-scope `404` on detail, approve, reject, or comment shows the friendly unavailable state and does not crash.
- Attachments, `createdBy`, `assignedTo`, and optional approval metadata render correctly when present and degrade gracefully when absent.

### Assumptions
- Owner request UX remains read/decide/comment only.
- The backend is the sole source of current scope and actionability.
- Friendly unavailable copy should explicitly communicate owner-scope loss rather than a generic error.
- No owner-specific estimate workflow or operational queue controls should be added.

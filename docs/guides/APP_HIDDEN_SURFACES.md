# App Hidden Surfaces

This guide tracks UI that is intentionally hidden, withheld, or scope-gated in the mobile app.

Use this document when:

- removing or re-enabling a hidden surface
- checking whether a missing action is intentional
- updating role routing or portal navigation

## Current Rules

### Tenant Portal

- The tenant home `Overview` section is intentionally hidden from `app/(tenant)/index.tsx`.
  - The home screen now starts with the hero, profile strip, service requests, announcements, quick actions, and contract snapshot.
- The `New Message` modal `Conversation overview` card is intentionally hidden from `app/(modals)/new-conversation.tsx`.
  - The composer now starts directly with availability state and conversation fields instead of the draft/send promo card.
- The tenant visitors screen no longer uses the large `Register Visitor` bottom bar.
  - It now uses a floating `+` CTA in `app/(tenant)/visitors.tsx`, aligned with the messages screen pattern.
- The tenant visitors `Share Digital Key` section is intentionally hidden from `app/(tenant)/visitors.tsx`.
  - The form only exposes visitor fields that are currently implemented.
- `New Request` is hidden when the tenancy state does not allow maintenance request creation.
  - Enforced in `app/(tenant)/index.tsx` and `components/ui/SideMenu.tsx` via `canCreateMaintenanceRequest`.
- `Visitors` is hidden when the tenancy state does not allow visitor management.
  - Enforced in `app/(tenant)/index.tsx` and `components/ui/SideMenu.tsx` via `canManageVisitors`.
- Former residents do not get the normal active-resident framing.
  - The tenant home switches to historical/resident-record messaging through `isFormerResident`.

### Authentication

- The login screen hides social sign-in providers that are not wired yet.
  - `Sign in with Google` and `Sign in with Apple` are intentionally hidden from `app/auth.tsx`.
- The login screen hides placeholder footer links that only showed not-yet-wired alerts.
  - `Privacy Policy`, `Terms of Service`, and `Contact Support` are intentionally hidden from `app/auth.tsx` until real mobile destinations exist.
- The login screen hides the old `Contact Management` footer line.
  - `app/auth.tsx` now ends the primary card at the cache action so production-backed sign-in copy does not point at a vague manual fallback.
- Multi-persona accounts do not auto-collapse into a single mobile portal on first entry.
  - They are routed through `app/workspace-selector.tsx` until a supported workspace is selected.
- Accounts with no supported mobile workspace are blocked from portal entry.
  - They land on `app/portal-unavailable.tsx` instead of being forced into a mounted portal.

### Building Employee Portal

- The legacy building employee `Shifts` screen is intentionally removed from the mounted mobile portal.
  - It is no longer linked from `app/(buildingEmployee)/index.tsx` and no longer registered in `app/(buildingEmployee)/_layout.tsx`.

### Owner Portal

- Owner data is scope-gated by active portfolio access.
  - Units, requests, request comments, conversations, and notifications only appear while the backend keeps them in current owner scope.
  - Out-of-scope request and conversation detail screens show an unavailable state instead of exposing stale or unauthorized UI.
- Owner request screens are intentionally read/decide/comment only.
  - Hidden from the owner UI:
    - assignment controls
    - provider controls
    - estimate submission flows
    - management queue controls
    - request status progression controls
  - Enforced primarily in `app/(owner)/requests/index.tsx` and `app/(owner)/requests/[requestId].tsx`.
- Owner notifications only deep-link to request detail or conversation detail.
  - They do not expose direct approval controls from the notifications list.
  - Actionability is resolved by the destination detail screen.

### Service Provider Portal

- The provider mobile portal is intentionally worker-scoped, not provider-admin-scoped.
  - Hidden from the provider worker UI:
    - assignment controls
    - provider staff-management surfaces
    - request cancel actions
    - building `INTERNAL` comments
- Provider access is blocked when runtime context is ambiguous.
  - `GET /provider/me` must resolve exactly one active provider membership before the mounted worker portal opens.
  - Zero memberships show a blocking no-access state.
  - Multiple memberships show a blocking ambiguous-access state until a multi-provider-safe mobile flow exists.
- Provider attachment submission is metadata-only.
  - The worker UI does not send raw multipart files to the provider request attachments endpoint.
  - Workers must supply attachment metadata plus an uploaded file URL.

### Portal Mounting

- Only these role portals are mounted in the app router:
  - tenant
  - owner
  - management
  - building employee
  - service provider
- Other roles may exist in types or backend payloads but are treated as unavailable until a portal is explicitly mounted.
- Source of truth: `lib/config/portals.ts`.

## Change Checklist

When you hide or re-enable a surface, update all of:

- the route or screen component that owns the UI
- `components/ui/SideMenu.tsx` if navigation visibility changes
- this document
- any role-routing or contributor docs affected by the change

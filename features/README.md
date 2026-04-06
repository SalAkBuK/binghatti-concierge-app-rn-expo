# Tower Desk Feature Docs

## Overview

This directory contains role-based feature documentation for Tower Desk.

These docs are not all at the same maturity level:
- some describe live mounted portals
- some describe early-stage mounted portals with planned workflows
- some are reference docs for roles that are not currently mounted

If a feature doc conflicts with the router under `app/` or the architecture guide in `docs/ARCHITECTURE.md`, trust the mounted code first.

## Runtime Reality

Live mounted role portals today:
- Tenant
- Management
- Building employee

Reference or planned role docs:
- Admin
- Service provider
- Employee

Shared runtime routes:
- `app/(modals)/`

## Role Index

| Role | File | Mount Status | Doc Status | Notes |
| --- | --- | --- | --- | --- |
| Admin | [admin.md](./admin.md) | Not mounted | Reference / legacy intent | No live `app/(admin)/` route group today |
| Management | [management.md](./management.md) | Mounted | Live portal with mixed maturity | Some workflows in the doc are still target-state |
| Tenant | [tenant.md](./tenant.md) | Mounted | Live portal with mixed maturity | Some mounted routes are lightly documented |
| Service Provider | [service-provider.md](./service-provider.md) | Not mounted | Planned / reference | Treat route paths as target IA only |
| Employee | [employee.md](./employee.md) | Not mounted | Planned / reference | API groundwork exists, but no live portal is mounted |
| Building Employee | [building-employee.md](./building-employee.md) | Mounted | Live portal, early-stage | Mounted route group exists, but most flows are still planned |

## How To Read These Docs

For mounted portals:
- use the doc as a guide to current behavior plus near-term intent
- verify route names and screen availability against `app/`

For non-mounted roles:
- use the doc as product intent and API planning reference
- do not assume the route group or navigation described there exists in the live app

## Current Mounted Route Groups

```text
app/
  (tenant)/           Live tenant portal
  (management)/       Live management portal
  (buildingEmployee)/ Live building employee portal
  (modals)/           Shared modal routes
```

Role docs that describe non-mounted route groups are still useful for planning, but those route groups are not part of the current runtime tree.

## Recommended Starting Points

- Runtime architecture: `docs/ARCHITECTURE.md`
- Contributor rules: `AGENTS.md`
- Project overview: `README.md`
- API services: `lib/services/api/README.md`
- Shared types: `lib/types/index.ts`

## Maintenance Rules

When updating a mounted portal:
- update the role doc to match the real route files
- call out planned sections clearly instead of presenting them as live

When documenting a non-mounted role:
- mark it as planned or reference-only near the top
- avoid language that implies the route group is currently registered

## Summary

The repo currently has:
- 6 documented role experiences
- 3 mounted role portals
- 3 reference-only role docs

Treat this directory as a mix of runtime notes and product intent, not as a guaranteed mirror of the mounted router.

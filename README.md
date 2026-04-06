# Tower Desk Mobile

Expo Router mobile app for Binghatti concierge and property operations.

## Current State

This repository is in an active transition from a broad multi-role concept to a cleaner, more maintainable app structure.

What is live today:
- Tenant portal
- Management portal
- Building employee portal
- Shared modal flows, auth, notifications, messaging, requests, and resident self-service

What is planned or partially scaffolded, but not fully mounted as first-class portals:
- Admin
- Super admin
- Service provider
- Employee
- Owner

The most important rule for contributors is: trust the runtime structure in `app/` and the architecture guide in `docs/ARCHITECTURE.md` over older docs that describe a `src/`-based layout or portals that are not currently mounted.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- Context-based state modules under `lib/context`
- REST clients under `lib/services/api`

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Android Studio for Android work
- Xcode for iOS work on macOS

### Install

```bash
npm install
```

### Run

```bash
npm start
```

Useful variants:

```bash
npm run android
npm run ios
npm run web
```

### Quality Checks

```bash
npm run lint
npm run typecheck
npm test
```

## Actual Project Structure

```text
app/                  Expo Router routes and portal entry points
  (tenant)/           Live tenant portal
  (management)/       Live management portal
  (buildingEmployee)/ Live building employee portal
  (modals)/           Shared modal routes

lib/                  Main app core
  context/            Auth, requests, notifications, messaging, domain modules
  hooks/              App-level hooks
  services/           API clients, storage, notifications
  types/              Shared TypeScript types
  utils/              Shared helpers and constants

components/           Reusable UI and role-specific UI building blocks
assets/               Images, icons, fonts, lottie assets
features/             Role and feature documentation
APIs/                 Backend/API notes and contracts
docs/                 Contributor-facing architecture and cleanup docs
  guides/             Stable operational/setup guides moved out of repo root
  archive/            Historical notes, source backups, design exports, and diagnostics
scripts/              Repo and maintenance scripts
  windows/            Windows-specific helper scripts
  dev/                Local development utilities
```

## Key Architecture Notes

- `app/` should stay thin. Route files should compose domain hooks and present screens, not own business logic.
- `lib/` is the current source of truth for shared app logic.
- `components/` contains reusable UI, including portal-specific components.
- `features/` documents planned and partial experiences, but some of those docs are ahead of the actual router state.
- Several domains are still hybrid: part API-backed, part mock/local-state backed. Check the architecture guide before assuming a screen is fully server-backed.
- `CLAUDE.md` intentionally remains at the repo root because Claude-compatible tooling expects that filename in-place.

## Main Docs

- [Architecture Guide](./docs/ARCHITECTURE.md)
- [App State Guide](./docs/APP_STATE.md)
- [Module Maturity Guide](./docs/MODULE_MATURITY.md)
- [Guides](./docs/guides/)
- [Archive](./docs/archive/)
- [Repository Guidelines](./AGENTS.md)
- [Feature Overview](./features/README.md)
- [API Notes](./APIs/)

## Contributor Rules

- Prefer adding new shared logic under `lib/`, not directly into route files.
- Do not assume a role is live just because types or docs mention it.
- Keep generated files, backups, and design exports out of runtime code paths.
- Put standalone operational notes under `docs/guides/` or `docs/archive/`, not the repo root.
- If you change routing, update both the router and the contributor docs in the same change.

## Current Risks

- `useApp()` still exists as a broad compatibility hook, even though runtime code is intended to use narrow hooks under `lib/context/`.
- A few management and job workflows still rely on mock/local state.
- Test coverage is minimal relative to repo size.

## Next Cleanup Priorities

1. Align route registration, side-menu links, and role redirects to one source of truth.
2. Keep `useApp()` compatibility-only and clarify ownership between app-state hooks and domain modules.
3. Make mock-backed modules explicit and easier to phase out.
4. Continue tightening contributor docs and archive boundaries as Phase 1 stabilization wraps up.

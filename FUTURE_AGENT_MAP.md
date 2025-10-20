# Future Agent Map
_Last reviewed: 7 October 2025 (Codex CLI, US time zone)_

## Mission Overview
This Expo + React Native app powers tenant and management experiences for the Binghatti concierge platform. It relies on Expo Router for navigation, local mock data via context providers, and modular UI primitives under `components/`. No network calls are live yet; the API layer is mocked but structured for an eventual backend.

## Bootstrapping Checklist
- Install deps with `npm install` (Node 18+ recommended).
- Launch the app with `npx expo start`; authenticate using seeded accounts (e.g., `tenant@demo.com` / any password, `admin@demo.com` for admin flows).
- Run linting via `npm run lint`; there is currently no automated test suite wired in the repo.

## Application Flow
1. **App root** (`app/`) uses Expo Router layouts:
   - `/` redirects based on `useApp()` context.
   - `/(tenant)` tenant tabs (Home, Requests, Amenities, Visitors, Bookings, Ratings, Profile).
   - `/(management)` operations tabs (Operations, Requests, Tenants, Units, Buildings, Workforce, Services, Activity).
   - `/(admin)` system administration tabs (Dashboard, Users, Buildings, Permissions, Jobs).
   - `/(modals)` host detail modals (request details, amenity booking, visitor registration, notifications hub, rating submission).
2. **State management** lives in `lib/context/`:
   - `ConnectedAppProvider` composes auth, requests, notifications, notices.
   - Each context uses mock data (`lib/utils/mockData.ts`) plus AsyncStorage persistence.
3. **UI layer** is composed of `components/`:
   - `components/ui` for shared primitives (header, skeletons, side menu, loading states).
   - `components/admin` for analytics dashboard widgets.
   - `components/notifications` for notice feeds.
4. **Services** in `lib/services/api/` define future REST integration, currently returning mocked responses.

## Directory Map
- `app/` — Expo Router entry screens. See `app/FUTURE_AGENT_NOTES.md`.
- `components/` — Shared and feature components. See `components/FUTURE_AGENT_NOTES.md`.
- `lib/` — Contexts, hooks, services, utilities, and type definitions. See nested guides starting with `lib/FUTURE_AGENT_NOTES.md`.
- `assets/` — Static imagery, Lottie animations, and SVG icon sources (`assets/FUTURE_AGENT_NOTES.md`).
- `constants/` — Theme palettes and status/priority tokens.
- `scripts/` — Node utilities to reset caches and clear auth storage.
- `types/` — Ambient typing (SVG module declaration) plus `lib/types` for domain models.

Refer to each `FUTURE_AGENT_NOTES.md` file inside the folders above for hands-on pointers and file-by-file responsibilities.

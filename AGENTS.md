# Repository Guidelines

## Project Structure And Ownership

- `app/` contains Expo Router entry points, layouts, and screen composition.
- `lib/` is the main app core today. Use it for shared state, services, types, hooks, and utilities.
- `components/` holds reusable UI, icons, and role-specific view components.
- `assets/` stores fonts, images, lottie files, and static assets.
- `features/` contains product and role documentation. Treat it as intent, not always runtime truth.
- `APIs/` contains backend notes and contracts.
- `docs/guides/` contains operational and contributor guides that are useful but not runtime code.
- `docs/archive/` contains historical notes, task dumps, source backups, design exports, and diagnostics kept for reference only.
- `scripts/` contains repo utilities; prefer `scripts/windows/` for Windows helpers and `scripts/dev/` for local development utilities.

## Active Portals

The router currently mounts these live route groups:

- `app/(tenant)/`
- `app/(management)/`
- `app/(buildingEmployee)/`
- `app/(modals)/`

Other roles may appear in docs, types, or navigation helpers, but they are not fully mounted portals unless the router explicitly registers them.

## Where New Code Should Go

- Add route-level UI in `app/`.
- Add shared business logic in `lib/context/` or `lib/hooks/`.
- Add backend access in `lib/services/api/`.
- Add reusable presentational UI in `components/`.
- Add shared types in `lib/types/`.

Avoid putting feature logic directly into route files unless it is truly route-specific glue.
Avoid adding new one-off docs, source backups, design exports, logs, or diagnostics to the repo root. Put them under `docs/guides/` or `docs/archive/` instead.
Keep `CLAUDE.md` at the repo root unless there is a deliberate tooling migration, since some Claude-oriented tooling expects it there.

## Build, Test, And Development Commands

- `npm install` installs dependencies.
- `npm start` starts Expo.
- `npm run android` launches Android.
- `npm run ios` launches iOS.
- `npm run web` launches web.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript without emit.
- `npm test` runs Jest.

## Coding Style

- TypeScript is strict. Prefer explicit types for shared interfaces and API payloads.
- Use 2-space indentation, single quotes, and trailing commas.
- Prefer named exports for shared utilities and modules.
- Keep components in PascalCase and hooks in `useSomething` form.

## Working With Roles And Portals

- Do not assume a role is live just because it exists in `User["role"]`.
- If you add or change role-based routing, update all of:
  - `app/_layout.tsx`
  - `app/index.tsx`
  - auth role mapping
  - navigation/menu logic
  - contributor docs

## Data Flow Expectations

- Some modules are API-backed.
- Some are hybrid or still rely on local/mock state.
- Use `docs/MODULE_MATURITY.md` as the repo-level source of truth for that status.
- Before editing a workflow, inspect the route file, the relevant app-state hook under `lib/context/use-*-app-state.ts`, the matching module under `lib/context/modules/`, and the service under `lib/services/api/`.
- Treat `lib/context/connected-app-provider.tsx` as composition glue for `useApp()`, not the default home for new domain rules. See `docs/APP_STATE.md`.

## Testing Guidelines

- Add tests beside the source area when practical, using `__tests__/`.
- Favor interaction and behavior tests over snapshots.
- Be explicit when a new screen or flow is still mock-backed and cannot be meaningfully integration-tested yet.

## Commit And PR Guidelines

- Use Conventional Commits such as `feat:`, `fix:`, `docs:`, and `chore:`.
- Keep PRs focused.
- Use the PR checklist in `.github/pull_request_template.md` for routing, docs, and validation changes.
- If you change repo structure, routing, or contributor workflows, update docs in the same PR.
- Do not mix cleanup of historical/generated artifacts with unrelated feature work unless the PR is explicitly a cleanup pass.

## Security And Configuration Notes

- Keep secrets in `.env.*` files and do not commit local-only env files.
- Update `app.json` and `eas.json` together when build identifiers or profiles change.
- Treat logs, profiling dumps, and generated exports as non-source artifacts unless there is a specific reason to keep them in version control.

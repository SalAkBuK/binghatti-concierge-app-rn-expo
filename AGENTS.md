# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Expo Router entry points and navigation wiring; avoid placing feature logic here.
- `src/` hosts feature code split into `screens/`, `components/`, `hooks/`, and `services/`; share UI primitives via `components/common/`.
- `assets/` stores images, icons, and fonts loaded through Expo’s asset system.
- Native scaffolding lives in `ios/` and `android/`; only touch these when configuration cannot be expressed in Expo config files.

## Build, Test, and Development Commands
- `npm install` (or `yarn install`) resolves JavaScript and native dependencies.
- `npx expo start` launches Metro; add `--clear` when caches misbehave.
- `npm run android` / `npm run ios` opens the app in Expo Go or a connected simulator.
- `npm run lint` enforces ESLint + Prettier rules.
- `npm test` executes the Jest test suite; use `npm run test:watch` during active development.

## Coding Style & Naming Conventions
- Prettier and ESLint define formatting; keep 2-space indentation, single quotes, and trailing commas per defaults.
- Use TypeScript strict mode with explicit interfaces or types for component props (`src/types/` when reusable).
- React components follow PascalCase (e.g., `BookingHeader.tsx`); hooks are `useSomething.ts`.
- Prefer named exports for utilities to aid tree shaking; avoid default exports in shared modules.

## Testing Guidelines
- Jest with React Native Testing Library lives under `__tests__/`; mirror source structure. Example: `src/screens/Dashboard/__tests__/DashboardScreen.test.tsx`.
- Target ≥80% coverage for new screens and focus on interaction assertions over snapshots.
- Add guards for new context actions (e.g., manager assignment) with integration-style tests when feasible.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`); keep subject lines under 72 characters.
- Squash fix-up commits before merging and ensure lint/tests pass locally.
- Pull requests must include a concise summary, linked Linear/Jira ticket, UI proof (screenshot/video) for visible changes, and rollout notes when native config alters.

## Security & Configuration Notes
- Store environment secrets in `.env.*`; never commit `.env.local`.
- Update `app.json` and `eas.json` together for identifier or build-profile changes.
- Document OTA releases in PRs and note `eas update --branch <branch>` commands executed.

# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds Expo routing entry points and navigation wiring.
- `src/` contains feature code split into `screens/`, `components/`, `hooks/`, and `services/`; reuse shared UI from `components/common/`.
- `assets/` stores images, icons, fonts; reference them via Expo’s asset loader.
- Native platform scaffolding lives under `ios/` and `android/`; avoid manual edits unless the change cannot be expressed through Expo config.

## Build, Test, and Development Commands
- `npm install` (or `yarn install`) resolves JavaScript and native modules.
- `npx expo start` boots the Metro bundler for local development; use `--clear` if Metro caches misbehave.
- `npm run android` / `npm run ios` launches the app inside the Expo Go client or attached simulator.
- `npm run lint` enforces formatting and ESLint rules across the codebase.

## Coding Style & Naming Conventions
- Prettier + ESLint drive formatting; keep default 2-space indentation and single quotes.
- TypeScript files use strict typing—prefer explicit interfaces for component props in `src/types/`.
- React component files follow PascalCase (e.g., `BookingHeader.tsx`); hooks use `useSomething.ts`.
- Avoid default exports for shared utilities; named exports ease tree shaking.

## Testing Guidelines
- Jest + React Native Testing Library live under `__tests__/`; mirror source structure for discoverability.
- Name test files `*.test.tsx` or `*.test.ts` and group scenario descriptions with `describe()` blocks.
- Run tests with `npm test`; use `npm run test:watch` during feature work.
- Keep coverage for new screens above 80%, and add snapshot tests sparingly—favor interaction assertions.

## Commit & Pull Request Guidelines
- History follows Conventional Commits (`feat:`, `fix:`, `chore:`); keep subject lines under 72 characters.
- Squash commits that only fix review feedback before merging.
- Pull requests must include: concise summary, linked Linear/Jira ticket, screenshots or videos for UI-visible changes, and rollout notes if native config shifts.
- Request review before merging; ensure CI (lint + tests) passes.

## Configuration & Security Notes
- Store environment-specific secrets in `.env.*`; never commit `.env.local`.
- Update `app.json` and `eas.json` together when changing app identifiers or build profiles.
- For OTA updates, document release notes in the PR and tag the deployment command you executed (`eas update --branch staging`).

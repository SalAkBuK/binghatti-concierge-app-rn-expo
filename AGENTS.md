# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds Expo Router entry points and navigation glue; keep feature logic out of this layer.
- `src/` contains feature code under `screens/`, `components/`, `hooks/`, and `services/`; reusable UI lives in `components/common/`.
- `assets/` stores images, icons, and fonts referenced via Expo’s asset system.
- Native scaffolding resides in `ios/` and `android/`; touch these only for configuration that Expo config files cannot express.
- Mirror source structure when adding test suites under `__tests__/`.

## Build, Test, and Development Commands
- `npm install` resolves JavaScript and native dependencies.
- `npx expo start` boots Metro; add `--clear` to flush caches when the packager misbehaves.
- `npm run android` / `npm run ios` launches Expo Go or connected simulators.
- `npm run lint` enforces the shared ESLint + Prettier ruleset before commits.
- `npm test` runs the Jest suite; `npm run test:watch` helps during active development.

## Coding Style & Naming Conventions
- Formatting follows Prettier defaults: 2-space indentation, single quotes, trailing commas.
- TypeScript runs in strict mode; define reusable types in `src/types/`.
- React components use PascalCase (e.g., `BookingHeader.tsx`); hooks follow `useSomething` naming.
- Prefer named exports for utilities and shared modules to aid tree shaking.

## Testing Guidelines
- Jest with React Native Testing Library powers the tests; keep interaction-focused assertions over snapshots.
- Target at least 80% coverage for new screens and cover new context actions with integration-style tests.
- Place tests in `__tests__` directories beside their source counterparts (e.g., `src/screens/Dashboard/__tests__/DashboardScreen.test.tsx`).

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`); keep subject lines under 72 characters.
- Ensure linting and tests pass locally before pushing.
- Pull requests need a concise summary, linked Linear/Jira ticket, UI proof (screenshot/video) for user-facing changes, and rollout notes for native config updates.
- Document OTA releases in the PR description, including any `eas update --branch <branch>` commands executed.

## Security & Configuration Notes
- Store environment secrets in `.env.*`; never commit `.env.local`.
- Update `app.json` and `eas.json` together when changing identifiers or build profiles.
- Record any EAS OTA release steps for traceability and handoff.

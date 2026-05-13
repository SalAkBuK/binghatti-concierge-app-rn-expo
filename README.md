# Towerdesk Mobile

Towerdesk Mobile is an Expo Router / React Native app for property concierge and building operations workflows. It supports authenticated mobile workspaces for residents, owners, management staff, building employees, and service provider workers.

This repository is not currently production-publication ready. It contains useful application work, but it still mixes real API integrations with mock-backed modules, depends on a private backend, and has publish-safety cleanup items that should be handled before making the repo public.

## Demo Or Screenshots

No public demo link or vetted screenshots are included yet.

Suggested before publishing:

- Add 2-4 screenshots that do not expose real tenant, owner, building, or backend data.
- Add a short demo video or Expo preview only after environment files and service configuration are sanitized.

## Features

- Authentication, session restoration, password reset, and forced password-change flow.
- Persona-based workspace routing after login.
- Resident workspace for requests, request history, amenities, bookings, visitors, lease details, messages, ratings, and profile flows.
- Owner workspace for portfolio overview, units, requests, messages, notifications, and profile flows.
- Management workspace for operations dashboards, requests, buildings, units, visitors, parcels, billing, maintenance, shifts, workforce, managers, activity, amenities, and profile flows.
- Building employee workspace for job/task workflows, amenities, messages, and profile management.
- Service provider worker workspace for assigned request handling.
- Shared modal flows for notifications, request details, conversations, visitor registration, amenity bookings, ratings, provider access, and job completion approval.
- REST API service layer with token storage, refresh handling, request helpers, and domain-specific clients.
- Jest coverage for routing, portal guards, request utilities, owner flows, resident flows, and selected hooks.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router 6
- TypeScript 5.9
- React Navigation
- Jest / jest-expo
- Expo SecureStore, Notifications, FileSystem, ImagePicker, DocumentPicker, Splash Screen, WebBrowser
- AsyncStorage
- Socket.IO client
- Lottie React Native
- EAS Build configuration for Android preview and production profiles

## Getting Started

### Prerequisites

- Node.js `>=20.19.4`
- npm
- Expo CLI through `npx expo`
- Android Studio for Android builds
- Xcode on macOS for iOS builds
- Access to the Towerdesk backend API, if you need real authenticated data

On Windows PowerShell, `npm.ps1` may be blocked by execution policy. Use `npm.cmd` if plain `npm` fails.

### Install

```bash
npm install
```

The install runs `patch-package` and applies the checked-in React Native Gradle plugin patch.

### Environment

The app reads these public Expo variables:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api
EXPO_PUBLIC_WS_BASE_URL=wss://api.example.com
```

The current repository has checked-in `.env.development` and `.env.production` files pointing at the Towerdesk API. Before publishing, replace committed environment files with a sanitized `.env.example` and keep real environment files out of version control.

### Run

```bash
npm start
```

Useful platform commands:

```bash
npm run android
npm run ios
npm run web
```

## Available Scripts

- `npm start` - start Expo.
- `npm run android` - start Expo and open Android.
- `npm run ios` - start Expo and open iOS.
- `npm run web` - start Expo for web.
- `npm run lint` - run Expo ESLint.
- `npm run typecheck` - run TypeScript without emitting files.
- `npm test` - run Jest.
- `npm run doctor` - run Expo Doctor.
- `npm run prebuild` - generate native projects.
- `npm run build:preview` - run EAS Android preview APK build.
- `npm run build:production` - run EAS Android production app bundle build.
- `npm run build:local` - prebuild Android and run a local release assemble.

## Project Structure

```text
app/                         Expo Router routes and layouts
  (tenant)/                  resident / tenant workspace
  (owner)/                   owner workspace
  (management)/              management workspace
  (buildingEmployee)/        building employee workspace
  (serviceProvider)/         service provider worker workspace
  (modals)/                  shared modal routes

components/                  reusable UI and portal-specific components
lib/                         main application logic
  config/                    portal and mobile workspace routing config
  context/                   auth, notifications, requests, app state modules
  hooks/                     domain hooks and screen hooks
  services/api/              REST clients and API mappers
  services/storage/          local storage and cache helpers
  types/                     shared TypeScript types
  utils/                     shared helpers, constants, mock data

assets/                      images, icons, Lottie files, static assets
APIs/                        backend notes and API contracts
features/                    role and feature documentation
docs/                        architecture, maturity, guides, archive
patches/                     patch-package patches
scripts/                     repo utilities and build helpers
android/                     generated native Android project currently present
dist-export-test/            generated export artifact currently present
```

## Current Status

The app is actively developed and has substantial runtime code, but it is not uniformly backend-backed.

Current data maturity from `docs/MODULE_MATURITY.md`:

- Auth/session: API-backed.
- Resident self-service and several request/owner flows: partly API-backed.
- Visitors: hybrid; resident visitor CRUD is API-backed, while general visitor lists, passes, and logs still rely on mock/local state.
- Property/management: hybrid; some backend calls exist, but cache/local state and simulated helpers remain.
- Amenities: mock-backed.
- Jobs: mock-backed.
- Ratings: mock-backed.

Validation from the latest audit:

- `npm.cmd ci --dry-run` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run doctor` passed.
- `npm.cmd test -- --runInBand` failed: one Jest test timed out in `app/__tests__/index.test.tsx`.
- `npx.cmd expo export --platform web` failed because `@lottiefiles/dotlottie-react` is missing for the web Lottie import path.

Native Android/iOS release builds were not verified in this audit.

## Known Limitations

- The repo depends on private Towerdesk backend services. A fresh clone can install and compile, but meaningful login and real data require backend access.
- Some screens appear operational while using mock or local-only state. This should be made clearer in the UI or fully replaced with backend integration.
- Web export currently fails due to a missing Lottie web dependency.
- One Jest test currently times out.
- Root environment files are committed and should be replaced with `.env.example` before publication.
- `google-services.json` is committed. Firebase config is not the same as a server secret, but it should still be reviewed and restricted before public release.
- `lib/config/cloudinary.ts` contains a hardcoded Cloudinary cloud name and unsigned upload preset. Review upload preset restrictions before publishing.
- Generated artifacts and local/tooling files are tracked, including `dist-export-test/`, `.claude/`, `.idea/`, `.vscode/`, archived logs, crash reports, profiling data, and source backups.
- Documentation is better than a typical prototype, but there is still drift between older feature docs and the current router/runtime state.
- No license file is present.

## Lessons Learned

- Keep route registration, role mapping, workspace selection, and menu definitions tied to one source of truth. This app has multiple role concepts, so drift is easy.
- Track module maturity explicitly. Mixing API-backed, hybrid, and mock-backed modules is workable during development only when the boundaries are documented.
- Keep generated exports, crash logs, source backups, and IDE/tooling state out of the publishable source tree.
- Treat mobile "public" environment variables as public configuration, not secrets, but still avoid committing project-specific production endpoints in an open repository.
- Validate web separately from native. Expo Doctor and TypeScript can pass while web export still fails on platform-specific dependencies.

## License

No license is currently provided. Until a license is added, this code should be treated as proprietary and not reusable by third parties.

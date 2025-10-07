# Future Agent Notes — `components/`
_Audit date: 7 October 2025_

## Folder Overview
- `admin/` — Dashboard widgets (analytics tiles, tabular data cards, job cards).
- `ui/` — Shared primitives: headers, skeleton loaders, animated buttons, side menu.
- `icons/` — SVG-driven icons packaged as React components to keep bundle consistent across platforms.
- `notifications/` — Lists and detail items for notices/notifications.
- `notifications` data flows pair with modal routes and contexts.
- Miscellaneous exports (`external-link.tsx`, `parallax-scroll-view.tsx`, `themed-text.tsx`) act as cross-feature utilities.

## Extension Guidance
- Prefer composing new UI using primitives inside `ui/`.
- Stick to functional components with TypeScript props; follow PascalCase filenames.
- When creating icons, add them to `icons/` and expose typed props if reusable.

# Future Agent Notes — `constants/`
_Logged: 7 October 2025_

## Contents
- `theme.ts` — Centralised color palette, typography tokens, spacing constants, and shadow settings for tenant/admin views.

## Guidance
- Extend design tokens here before hard-coding colors in UI components.
- If you add dark mode support, branch tokens by `colorScheme` and surface helpers in `hooks/use-theme-color.ts`.

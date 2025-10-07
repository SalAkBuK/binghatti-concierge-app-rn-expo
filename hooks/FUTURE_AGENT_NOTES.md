# Future Agent Notes — `hooks/`
_Refreshed: 7 October 2025_

## Available Hooks
- `use-color-scheme.ts` / `.web.ts` — Platform-aware color scheme detection.
- `use-theme-color.ts` — Helper to pull tokens from the current theme (light/dark handling).

## Best Practices
- Place global (non-context) hooks here.
- Avoid business-logic hooks; those belong in `lib/hooks` to keep separation between UI helpers and data/state utilities.

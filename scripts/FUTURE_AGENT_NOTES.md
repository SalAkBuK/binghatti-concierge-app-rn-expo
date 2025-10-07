# Future Agent Notes — `scripts/`
_Logged: 7 October 2025_

## Utilities
- `clear-auth-cache.js` — Clears Expo AsyncStorage/Auth cache (prompts for confirmation, attempts `adb shell pm clear host.exp.exponent`, restarts Metro with `--clear`).
- `reset-project.js` — Legacy scaffold reset tool that nukes/moves core directories into `app-example/` and recreates a bare Expo structure. Use with caution.

## Usage
- Run with `node scripts/<name>.js` from repo root.
- Both scripts require interactive confirmation; they are safe in development environments only.

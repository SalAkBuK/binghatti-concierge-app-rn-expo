# Future Agent Notes — `assets/`
_Reviewed: 7 October 2025_

## Layout
- `TenantIcons/` — SVG + PNG assets for tenant tabs and dashboards.
- `images/` — Marketing/background imagery (check before shipping for licensing).
- `lottie/` — Lottie animation JSON used by `LoadingScreen` and other skeletons.

## Tips
- Import assets via Expo’s module system (`require("assets/...")`) to benefit from bundler hashing.
- Keep filenames snake- or kebab-case free of spaces to simplify imports; consider renaming legacy assets when touched.

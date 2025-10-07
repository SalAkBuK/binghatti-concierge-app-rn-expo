# Future Agent Notes — `components/icons/`
_Updated: 7 October 2025_

## Usage
- Each file exports a named React component wrapping an SVG via `react-native-svg`.
- Example: `RequestsTabIcon.tsx` renders the tab icon for tenant requests; `ProfileIcon.tsx` powers the profile tab.
- Import them directly where needed (`import { RequestsTabIcon } from "../components/icons/RequestsTabIcon"`).

## Adding New Icons
- Keep sizing consistent (default `width`/`height` 24 unless tab-specific).
- Co-locate static SVG paths; avoid pulling from `assets/` unless absolutely necessary to keep tree shaking effective.

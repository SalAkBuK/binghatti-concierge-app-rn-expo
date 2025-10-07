# Future Agent Notes — `components/ui/`
_Doc timestamp: 7 October 2025_

## Reusable Primitives
- `HeaderBar.tsx` — Top navigation with notification badge + side menu toggles.
- `SideMenu.tsx` — Slide-over drawer listing quick links and user actions.
- `AnimatedButton.tsx`, `AnimatedBellIcon.tsx` — Wrappers around `react-native-reanimated`.
- Skeletons (`HomeScreenSkeleton.tsx`, `RequestsScreenSkeleton.tsx`, `SkeletonCard.tsx`, `SkeletonText.tsx`) standardise loading states.
- `LoadingScreen.tsx` — Splash/transition screen used during auth gating.
- `AttachmentPicker.tsx`, `ImageViewer.tsx` — Manage media attachments.
- `collapsible.tsx` — Utilities for animated dropdown sections.

## Integration Tips
- All components expect theme colors from `constants/theme`.
- Keep new primitives stateless; pass handlers via props so they work across tabs.

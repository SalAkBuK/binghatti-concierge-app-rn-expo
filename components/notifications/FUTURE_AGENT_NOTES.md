# Future Agent Notes — `components/notifications/`
_Reviewed: 7 October 2025_

## Purpose
Presentation layer for notifications and maintenance notices.

## Component Rundown
- `NotificationsList.tsx` / `NotificationItem.tsx` — Feed + row for user notifications.
- `NoticesList.tsx` / `NoticeItem.tsx` — Maintenance notice list for tenants.
- `NotificationsTabBar.tsx` — Segment control used in the notifications modal.

## Implementation Notes
- Accepts callbacks from `useApp().actions` to mark items read or dismiss them.
- Styling is harmonised with tenant palette; reuse the tokens exposed by `constants/theme.ts`.

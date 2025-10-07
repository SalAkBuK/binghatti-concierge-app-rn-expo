# Future Agent Notes — `app/(modals)`
_Snapshot: 7 October 2025_

## Modal Inventory
- `request-details.tsx` — Renders the active maintenance ticket; expects `actions.setSelectedRequest` to be called before navigation.
- `amenity-booking-form.tsx` — Books amenities via `actions.createBooking`.
- `register-visitor.tsx` — Creates visitor passes and persists in context.
- `submit-rating.tsx` — Records service provider ratings, updating `actions.createRating`.
- `notifications-hub.tsx` — Consolidated notifications feed with mark-as-read support.
- `notice-details.tsx` — Detailed maintenance notice view.

## Usage Tips
- Invoke modals with `router.push("/(modals)/<name>")`.
- When adding a modal, register it in `_layout.tsx` so Expo Router treats it with `presentation: "modal"`.
- All modals rely on context to store the selected entity; avoid passing large params through the route.

# Tenant Design Cleanup Notes

Last reviewed: April 9, 2026

Purpose: keep a durable record of tenant portal UI inconsistencies that should be cleaned up in a future design pass.

## Current Direction

The tenant portal appears to have two design generations in the codebase.

- Newer tenant screens use the slate and cream palette, softer surfaces, larger radii, stronger hero sections, and more editorial card layouts.
- Older tenant screens still use a purple accent (`#7034FF`), smaller radii, flatter list cards, and a more utility-style visual treatment.

The newer direction is the one already visible in:

- `app/(tenant)/index.tsx`
- `app/(tenant)/requests.tsx`
- `app/(tenant)/messages.tsx`
- `app/(tenant)/visitors.tsx`
- `app/(tenant)/profile.tsx`
- `app/(tenant)/lease-details.tsx`
- `app/(tenant)/new-request.tsx`

## Screens That Still Feel Out Of Family

### 1. Amenities

File: `app/(tenant)/amenities.tsx`

Observed issues:

- Uses purple active states instead of the newer tenant primary system.
- Uses smaller 12px cards and tighter geometry than the newer tenant screens.
- Uses the older gray and Tailwind-style neutral palette rather than the slate and cream palette.
- Lacks the stronger top-of-screen hierarchy now used in requests and messages.

Concrete examples:

- `filterButtonActive` uses `#7034FF`
- `amenityCard` uses `borderRadius: 12`
- `container` uses `#F9FAFB` instead of the newer shared tenant background pattern

### 2. My Bookings

File: `app/(tenant)/my-bookings.tsx`

Observed issues:

- Same older purple accent system as amenities.
- Filter tabs look visually detached from the newer tenant pills and chips.
- Cards use smaller radius and flatter structure than the newer tenant card language.
- Spacing is based on `SCREEN_WIDTH * 0.05`, while newer screens use a fixed 20px gutter more consistently.

Concrete examples:

- `filterTabActive` uses `#7034FF`
- `bookingCard` uses `borderRadius: 12`
- `container` uses `#F9FAFB`

### 3. My Ratings

File: `app/(tenant)/my-ratings.tsx`

Observed issues:

- Uses a third visual language instead of matching either the newer tenant system or the older purple system cleanly.
- Mixes green emphasis for rating states with bright blue response panels, which makes the page feel disconnected from the tenant palette.
- Uses a centered modal instead of the bottom-sheet style used by newer tenant flows.
- Card geometry and typography still feel older and flatter than the updated tenant screens.

Concrete examples:

- Rating emphasis uses green (`#10B981`)
- Provider response blocks use bright blue (`#EFF6FF`, `#356FEC`, `#1E40AF`)
- Modal overlay and card are centered instead of bottom-sheet based

## Cross-Screen Inconsistencies

### Palette inconsistency

- Newer screens use slate and cream tokens like `#4D6169`, `#34474D`, `#F8EFE4`, `#D9E0E4`.
- Older screens still use purple and generic Tailwind-like neutrals such as `#7034FF`, `#E5E7EB`, `#6B7280`.

### Card geometry inconsistency

- Newer screens commonly use larger rounded cards around 22px to 28px radius.
- Older screens still use 8px to 12px radius in cards, badges, and filter controls.

### Header and hero inconsistency

- `requests` and `messages` have strong hero sections after `HeaderBar`.
- `amenities`, `my-bookings`, and `my-ratings` mostly go straight into filters or list content.
- This makes the tenant portal feel uneven in information hierarchy.

### Modal inconsistency

- Newer tenant flows lean toward bottom-sheet interaction patterns.
- `my-ratings` still uses a centered modal, which feels like a different product surface.

### Spacing inconsistency

- Newer screens commonly use fixed horizontal padding like `20`.
- Older screens still use `SCREEN_WIDTH * 0.05`, causing alignment drift across the portal.

## Recommended Future Cleanup Order

1. Align `app/(tenant)/amenities.tsx` to the current tenant palette and card system.
2. Align `app/(tenant)/my-bookings.tsx` to the same palette, spacing, and chip patterns.
3. Redesign `app/(tenant)/my-ratings.tsx` to match the newer tenant hierarchy and modal treatment.
4. After those three are updated, extract a shared tenant design token set or shared screen primitives if duplication remains high.

## Suggested Guardrails For Future Tenant UI Work

- Prefer the slate and cream tenant palette already used by `requests`, `messages`, `visitors`, and `profile`.
- Prefer larger card radii and softer surfaces over flat utility-style cards.
- Prefer fixed horizontal screen gutters unless a screen has a strong reason not to.
- Prefer hero or summary sections on major list screens when they materially improve hierarchy.
- Prefer bottom-sheet patterns over centered modal dialogs for tenant detail overlays unless desktop parity is required.


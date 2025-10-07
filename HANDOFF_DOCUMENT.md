# Tower Desk - Project Handoff Document

## Project Overview

**App Name:** Tower Desk (formerly Binghatti Concierge App)
**Type:** Multi-tenant property management mobile application
**Tech Stack:** Expo Router, React Native, TypeScript
**Location:** `C:\Users\13463\OneDrive\Documents\CodeFier\binghatti-concierge-app-rn-expo`

---

## Current Status: ✅ COMPLETE

### What's Been Implemented:

#### 1. **Full Responsive Design**

- ✅ Home screen fully responsive for all phone sizes
- ✅ Requests screen fully responsive for all phone sizes
- ✅ Safe area insets for notches/status bars
- ✅ Dynamic dimensions using `Dimensions.get('window')`
- ✅ Percentage-based widths and paddings

#### 2. **Home Screen (index.tsx)**

- ✅ Welcome Card with gradient background
- ✅ Action Buttons (New Request, My Requests)
- ✅ Building Notices section
- ✅ Recent Activity section
- ✅ All cards match exact client design specs

#### 3. **Requests Screen (requests.tsx)**

- ✅ Stat cards (Total, Completed, In Progress, Pending)
- ✅ Past Requests list
- ✅ Pull-to-refresh functionality
- ✅ Responsive layout

#### 4. **Bottom Tab Navigation**

- ✅ Custom tab icons with active/inactive states
- ✅ Active tab background: 70×64px with #EFF6FF
- ✅ Icon colors: #356FEC (fill), #336BE3 (stroke)
- ✅ Proper spacing and safe area handling

---

## Key Technical Details

### File Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx          # Tab navigation configuration
│   ├── index.tsx            # Home screen (Tenant)
│   ├── requests.tsx         # Requests screen
│   ├── new-request.tsx      # New request form
│   └── profile.tsx          # Profile screen
├── auth.tsx                 # Authentication screen
└── _layout.tsx              # Root layout

components/
└── icons/
    ├── NewHomeTabIcon.tsx   # Home tab icon
    ├── RequestsTabIcon.tsx  # Requests tab icon
    ├── NewTabIcon.tsx       # New/Plus tab icon
    └── ProfileIcon.tsx      # Profile tab icon

lib/
└── context/
    └── connected-app-provider.tsx  # Global state management
```

### Important Files to Know

1. **app/(tabs)/index.tsx** - Main home screen
   - Uses `SCREEN_WIDTH` for responsive sizing
   - Has `useSafeAreaInsets` for dynamic padding
   - All cards are 90% of screen width

2. **app/(tabs)/requests.tsx** - Requests listing screen
   - Responsive stat cards
   - Already has refresh control

3. **app/(tabs)/\_layout.tsx** - Tab bar configuration
   - Tab bar height: 74px + safe area
   - Custom tab icons

4. **lib/context/connected-app-provider.tsx** - Global state
   - User authentication
   - Requests data
   - Notifications

---

## Design Specifications

### Colors

#### Primary Colors

- **Primary Blue (Gradient Start):** `#7034FF`
- **Primary Blue (Gradient End):** `#1B28B1`
- **Action Blue:** `#356FEC`
- **Border Blue:** `#336BE3`

#### Status Colors

- **Pending Background:** `#FFEDD5`
- **Pending Text:** `#EA5846`
- **Progress Background:** `#DBEAFE`
- **Progress Text:** `#1E40AF`

#### Neutral Colors

- **Background:** `#F9FAFB` / `#F8F9FA`
- **Card Background:** `#FFFFFF`
- **Border:** `#F3F4F6`
- **Text Primary:** `#1F2937`
- **Text Secondary:** `#6B7280`

#### Tab Colors

- **Active Tab Background:** `#EFF6FF`
- **Active Icon Fill:** `#356FEC`
- **Active Icon Stroke:** `#336BE3`
- **Inactive Icon:** `#8296C4`
- **Active Text:** `#336BE3`
- **Inactive Text:** `#8296C4`

#### Card Specific

- **Building Notice:** `#FFF8EC`
- **Building Notice Border:** `#EEDAB8`
- **Activity Item:** `#F1F5F9`
- **Total Requests:** `#E7EFF8`

### Dimensions (Responsive)

#### Home Screen

- **Welcome Card:** 90% screen width × min(aspect ratio, 35% screen height)
- **Action Buttons:** flex: 1 (equal widths), minHeight: 64px
- **Building Notices:** 90% screen width × minHeight: 187px
- **Recent Activity:** 90% screen width × minHeight: 215px
- **Activity Items:** 100% width × minHeight: 56px
- **Status Badge:** minWidth: 68px, minHeight: 26px

#### Tab Navigation

- **Active Tab Container:** 70px × 64px
- **Active Tab Background:** Starts 10px from top, 6px border radius
- **Inactive Tab Container:** 54px × 39px
- **Tab Bar Height:** 74px + safe area padding
- **Tab Label:** 12px font, weight: 500

#### Requests Screen

- **Stat Cards:** flex: 1, maxWidth: 45% screen, minHeight: 132px
- **Border Radius:** 10px (was 20px, updated)

### Spacing

- **Horizontal Padding:** 5% of screen width
- **Welcome Card Bottom Margin:** 30px
- **Action Buttons Gap:** 20px
- **Header Padding Top:** `Math.max(insets.top, 20)`

---

## Responsive Implementation Pattern

All screens follow this pattern:

```typescript
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Screen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% padding
  },
  card: {
    width: SCREEN_WIDTH * 0.9, // 90% width
    minHeight: 200, // Flexible height
  },
});
```

---

## Next Steps: Loading Screens & Animations

### PLAN TO IMPLEMENT

#### Phase 1: Setup & Dependencies

**Task 1: Install Animation Libraries**

- `react-native-reanimated` (already installed with Expo)
- Optional: `lottie-react-native` for custom animations
- Check package.json and install if needed

#### Phase 2: Skeleton Loaders

**Task 2: Create Skeleton Components**

- Create `components/ui/SkeletonCard.tsx`
- Create `components/ui/SkeletonText.tsx`
- Implement shimmer/pulse animation

**Task 3: Home Screen Skeleton**

- Add loading state to index.tsx
- Show skeleton while data loads:
  - Welcome Card skeleton
  - Action Buttons skeleton
  - Building Notices skeleton
  - Recent Activity items skeleton

**Task 4: Requests Screen Skeleton**

- Add loading state to requests.tsx
- Show skeleton for:
  - Stat cards
  - Request list items

#### Phase 3: Loading States

**Task 5: Authentication Loading**

- Add loading screen in auth.tsx
- Show spinner/animation while checking auth
- Smooth transition to home

**Task 6: Data Fetching States**

- Show skeletons while loading requests
- Show skeletons while loading notifications
- Handle empty states

#### Phase 4: Animations

**Task 7: Card Animations**

- Fade-in for Welcome Card (use Animated API)
- Staggered fade-in for Action Buttons
- Staggered fade-in for Building Notices & Recent Activity
- Timing: 300-500ms, easing: ease-out

**Task 8: Button Interactions**

- Scale animation on TouchableOpacity press
- Scale down to 0.95 on pressIn
- Scale back to 1.0 on pressOut
- Duration: 150ms

#### Phase 5: Testing & Polish

**Task 9: Cross-Device Testing**

- Test on small phones (iPhone SE - 375px width)
- Test on large phones (iPhone 15 Pro Max - 430px width)
- Check Android behavior
- Verify performance (60fps)

---

## Animation Guidelines

### Timing

- **Fade In:** 300-400ms
- **Button Press:** 100-150ms
- **Stagger Delay:** 50-100ms between items
- **Skeleton Pulse:** 1000-1500ms loop

### Easing

- **Fade In:** `Easing.out(Easing.ease)`
- **Button Press:** `Easing.inOut(Easing.ease)`
- **Skeleton:** `Easing.inOut(Easing.ease)`

### Performance

- Use `useNativeDriver: true` whenever possible
- Avoid animating layout properties
- Stick to `opacity` and `transform` for best performance

---

## Implementation Notes

### What Works Well

✅ All responsive dimensions scale perfectly
✅ Safe area insets work on all devices
✅ Design specs match client requirements exactly
✅ Tab navigation is polished and consistent

### What to Watch Out For

⚠️ Don't add fixed widths/heights - keep responsive
⚠️ Always use `Math.max(insets.top, 20)` for header padding
⚠️ Keep animations performant (use native driver)
⚠️ Test on both iOS and Android

### Code Consistency

- Use TypeScript for all new files
- Follow existing naming conventions
- Keep components small and focused
- Use StyleSheet.create for styles
- Comment complex logic

---

## Testing Checklist

Before marking complete, verify:

- [ ] Animations run at 60fps
- [ ] Loading states show/hide correctly
- [ ] Skeletons match actual content layout
- [ ] Works on iPhone SE (375px width)
- [ ] Works on iPhone 15 Pro Max (430px width)
- [ ] Works on Android devices
- [ ] No layout shifts when content loads
- [ ] Smooth transitions between states

---

## Useful Commands

```bash
# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Clear cache if needed
npx expo start -c

# Check for package issues
npm install
```

---

## Questions to Ask if Unclear

1. **Should skeleton loaders match exact card dimensions?**
   Yes - maintain layout consistency

2. **How long should data fetching simulate?**
   Use real API calls, add 200ms minimum for animation

3. **Should animations be configurable?**
   No - keep them simple and consistent

4. **Native driver for all animations?**
   Yes, except when animating layout properties

---

## Contact/Reference

- **Project Path:** `C:\Users\13463\OneDrive\Documents\CodeFier\binghatti-concierge-app-rn-expo`
- **Design Reference:** XD files in `assets/images/tenant/`
- **Previous Session:** Completed full responsive design + tab navigation
- **Current Session Goal:** Add loading screens & animations

---

## Quick Start for Next Session

1. Read this document fully
2. Check current package.json for installed libraries
3. Start with Phase 1: Install any missing animation libraries
4. Create skeleton components first (reusable)
5. Add to home screen, then requests screen
6. Add animations last
7. Test thoroughly

**Good luck! The foundation is solid - now make it delightful! 🚀**

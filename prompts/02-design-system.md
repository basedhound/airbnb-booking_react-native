# 02 · Design system

Status: done

## Goal
Every screen draws from one set of tokens (color, type, spacing, radius, shadow, motion) and a small set of primitives (Text, Button, IconButton, TextField, Chip, Badge, Alert, SegmentedControl, Stepper, Toggle, Icon) that match the Roam design sheet. A preview screen shows them all.

## Decisions
- Source: the Roam design sheet (sections 01–15), attached in chat. Ask for it again when building in a new session.
- Storage: tokens are CSS-first in `src/global.css` `@theme` (NativeWind v5 idiom, per the expo-design-system skill's Tailwind guidance). Values only JS needs (motion) live in `src/theme/motion.ts`. No second color file: icons and Switch get colors from classes through `styled` `nativeStyleMapping`.
- Units: set `--spacing: 4px` and `:root { font-size: 16px }` so the Tailwind numeric scale is a 4pt grid on every platform (native `rem` defaults to 14). All theme values are in `px`.
- Font: Plus Jakarta Sans static TTFs (Regular 400, Medium 500, SemiBold 600, Bold 700) copied from the `@expo-google-fonts/plus-jakarta-sans@0.4.2` tarball into `assets/fonts/` with its OFL license. No npm dependency. Loaded at runtime with `useFonts` from `expo-font` (already installed) in `src/app/_layout.tsx` behind the splash screen, so Expo Go keeps working. Family names: `PlusJakartaSans-Regular|Medium|SemiBold|Bold`.
- Font utilities are `font-jakarta`, `font-jakarta-medium`, `font-jakarta-semibold`, `font-jakarta-bold`. Don't override `--font-sans` (NativeWind sets it per platform), and don't use `font-bold` etc. for weight (that sets `fontWeight`, not the family). Screens use `<Text variant>` and never set font classes directly.
- Icons: `expo-symbols` `SymbolView` (SF Symbols on iOS, Material Symbols on Android/web), wrapped as `Icon` with `name={{ ios, android, web }}` and color from a `text-*` class mapped to `tintColor`.
- Light mode only: `app.json` `userInterfaceStyle` → `"light"`. Tokens are semantic, so dark values can be added later as `@media (prefers-color-scheme: dark)` overrides.
- Toggle: the native `Switch` (not re-implemented), styled so `trackColor`/`thumbColor` come from tokens.
- Brand wordmark (`roam`) and Google "G" logo are not in `assets/`. The secondary button takes an icon slot, and the preview uses a marked placeholder.

### Tokens (from the sheet; * = estimated from the image)
Colors (exact from section 02):
- `primary` #FFC629 — primary actions, active states
- `lavender` #C9B4FF — secondary actions, highlights, focused field border
- `ink` #0B0B1A — headings, primary text
- `ink-muted` #6B7280 — body/secondary text
- `surface` #FFFFFF — cards, sheets, modals
- `surface-muted` #F4F5F7 — app background, input fields
- `border` #E5E7EB — dividers, borders
- `glass` rgba(255,255,255,0.7) — tab bar, glass surfaces

Proposed new tokens (not in the palette but used by components; sampled from the image):
- `ink-subtle` #9AA1B4* — placeholder text, "/ night", review count
- `lavender-soft` #F3F0FF* — focused field fill, policy card fill
- `accent` #5B3DF5* — policy card icons/chevrons
- `primary-soft` #FEF6DC* — "Guest favorite" badge
- `success` #1A7F50*, `success-soft` #E3F4EC* — success alert, "New" badge
- `danger` #E03A45*, `danger-soft` #FDE4EA* — error alert
- `promo-soft` #FEE9F0* — "20% off" badge
- `info` #1D3FBF*, `info-soft` #EAF0FD* — "Superhost" badge

Type ramp (section 03; line heights snapped to whole px):
- `display` 56/56 Bold (sheet: 56–64, lh 1.0)
- `heading` 28/34 Bold (sheet: 28–32, lh 1.2)
- `title` 20/26 Bold* (listing card title)
- `subtitle` 16/22 SemiBold* (policy card title, alert/row titles)
- `body` 16/24 Regular (sheet)
- `label` 15/20 Medium* (chips, segmented control, field text 16 uses `body`)
- `button` 17/22 Medium (sheet: 17–18 Medium)
- `caption` 14/20 Medium (sheet)
- `footnote` 12/16 Medium* (tab labels, small chips, card descriptions)

Spacing: Tailwind numeric scale on a 4pt grid (`p-1` = 4 … `p-12` = 48). No arbitrary values. Screen gutter `px-5` (20)*. Stack gaps `gap-2`/`gap-3`/`gap-4`.

Radius: `rounded-sm` 8, `rounded-md` 12 (alerts, small cards), `rounded-lg` 16 (fields, cards, images), `rounded-xl` 24 (sheets), `rounded-full` (buttons, chips, badges, icon buttons, segmented, stepper). Add `corner-squircle` on non-capsule radii (NativeWind's continuous-corner utility).

Shadows (`boxShadow`): `shadow-card` 0 1px 2px rgba(11,11,26,0.05), `shadow-raised` 0 4px 12px rgba(11,11,26,0.08), `shadow-overlay` 0 8px 24px rgba(11,11,26,0.12)*.

Motion (`src/theme/motion.ts`): `fast` 150 ms (press, toggle), `base` 250 ms (enter/exit), `slow` 400 ms (sheets), plus one shared spring config.

### Components (`src/components/ui/`, re-exported from `index.ts`)
All accept `className` (layout only) and `style` (merged last). Pressables give pressed feedback (opacity 0.7) and expose role and state for accessibility. Sizes are estimates read from sections 04–15 at ~1x.
- `Text` — `variant` (ramp above, default `body`), color via `className` (default `text-ink`).
- `Button` — `variant` `primary` (yellow fill, ink `button` text) | `secondary` (white fill, `border` 1px, ink text). Sizes `md` h-14 (56) / `sm` h-10 (40). Optional leading `icon` node and trailing `trailingIcon` (the arrow), `loading`, `disabled` (opacity 0.4). `rounded-full`.
- `IconButton` — circle, `surface-muted` fill. Sizes `md` 56* / `sm` 36* (the card's heart is white). Required `accessibilityLabel`. Icon 24/18.
- `TextField` — h-14, `rounded-lg`, `surface-muted` fill, 1px `border` at 60%. Focused: `lavender-soft` fill and 2px `lavender` border. Leading `icon`, trailing `accessory` (filter button, or eye toggle when `secure`). Text `body` ink, placeholder `ink-subtle`.
- `Chip` — selectable filter (`accessibilityRole="button"` + `selected`). `size` `md` h-12 `label` text (row 1) / `sm` h-11 `footnote` text with optional `icon` (row 2). Unselected: `surface` fill + `border`. Selected `tone` `lavender` (row 1) or `primary` (row 2).
- `Badge` — static tag, h-9, `rounded-full`, `caption`. `tone`: `primary` (primary-soft/ink, optional icon), `success` (success-soft/success), `promo` (promo-soft/ink), `info` (info-soft/info).
- `Alert` — h-12 min, `rounded-md`, `success` | `danger` tone (soft fill, solid icon circle, toned `caption` text), optional dismiss ✕ (`onDismiss`).
- `SegmentedControl` — `surface-muted` track, `rounded-full`, h-12. Selected segment is an ink pill with white text/icon; options take `label` and optional `icon`.
- `Stepper` — `surface` pill with `border`, − value + controls, `min`/`max`, disabled ends, `accessibilityRole="adjustable"`.
- `Toggle` — native `Switch`, on track `primary`.
- `Icon` — `SymbolView` wrapper: `name`, `size` (default 24), color from `className` `text-*`.

## Out of scope
- Listing card, policy card, profile row, glass tab bar (built with their features; glass will use `expo-glass-effect`).
- Dark palette, the `roam` wordmark, the Google logo asset.
- Navigation header styling.

## Steps
### 1. Fonts
Copy the four TTFs as `assets/fonts/PlusJakartaSans-{Regular,Medium,SemiBold,Bold}.ttf` plus `assets/fonts/OFL.txt`. In `src/app/_layout.tsx`, call `SplashScreen.preventAutoHideAsync()`, load the fonts with `useFonts` keyed by those names, hide the splash and render the Stack once they are loaded (or on error). Done when a `Text` with `fontFamily: "PlusJakartaSans-Bold"` renders in Jakarta on iOS.

### 2. Tokens
Add the `@theme` block (colors, `--spacing`, fonts, `--text-*` with `--line-height`, radius, shadows) and `:root { font-size: 16px }` to `src/global.css`. Add `src/theme/motion.ts` and `src/theme/index.ts`. Set `userInterfaceStyle: "light"` in `app.json`. Done when `bg-primary p-4 rounded-lg` renders yellow, 16 pt padding, 16 pt radius.

### 3. Primitives
Build the components above in `src/components/ui/` with a `cn()` class joiner in `src/lib/cn.ts` (no dependency). Lint and tsc pass.

### 4. Preview screen
Replace the smoke test in `src/app/index.tsx` with a scrollable "Design system" preview: palette swatches, type ramp, buttons, icon buttons, fields (search/default/focused/password), chips, badges, alerts, segmented control, toggle + stepper, and the icon set (house, magnifyingglass, heart, calendar, person, gearshape, mappin, slider.horizontal.3). It stays until the home screen replaces it.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass.
- iOS simulator: screenshot the preview and compare it with the sheet section by section. List every difference, fix, repeat. Check pressed states, field focus, chip/segment selection, stepper limits, toggle, and password eye toggle by tapping.
- Grep: no hex colors or `fontSize`/`fontFamily` literals outside `src/global.css`, and no arbitrary `[..px]` classes in `src/components` or `src/app`.

## AGENTS.md updates
New "Design system" section: tokens live in `src/global.css` `@theme` (JS-only values in `src/theme/`); use `Text variant`, never font classes or sizes in screens; 4pt grid via the numeric scale, no arbitrary values; icons are `Icon` (expo-symbols); light mode only; primitives live in `src/components/ui/`, and a view is promoted there only once two screens use it; fonts load at runtime with `useFonts` (switch to the `expo-font` config plugin once the app moves to a development build).

## Result
Built as planned. Changes made while building:
- Line heights are unitless ratios (e.g. `--text-body--line-height: 1.5`). NativeWind RC0 multiplies a `px` line height by the font size, so `56px` pushed text thousands of points down.
- Button text: the sheet labels it Medium, but its primary "Book this stay" renders clearly heavier than the Medium caption. Primary uses SemiBold (`button`), secondary uses Medium (`buttonSecondary`).
- Text and Icon take a `tone` prop for color instead of `text-*` classes, since two color classes on one element resolve by CSS order, not by call order. `IconButton` gained a `ghost` variant for the same reason.
- Icons render at SF weight `medium`. Beach uses `water.waves` (the sheet shows waves), and Villas uses `beach.umbrella` because SF Symbols has no palm tree.
- The preview accepts `?y=<offset>` to open scrolled (a screenshot aid).
Lint, tsc, expo-doctor (18/18) and the drift greps pass. Each preview section was screenshotted on the iOS simulator. Taps (pressed states, focus, toggles) were not exercised; no tap automation is installed.

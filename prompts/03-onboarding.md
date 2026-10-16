# 03 · Onboarding

Status: done

## Goal
On launch the guest sees a three-slide onboarding carousel that matches the design. "Get started", "Continue with Google" and "Skip" take them into the auth flow, which uses stub sign-up and sign-in screens until Clerk is wired in.

## Decisions
- Source: the onboarding design (slide 1 only), attached in chat. Ask for it again when building in a new session. Sizes were read at about 1.465 px/pt (430 pt wide frame), a scale where the primary button measures 55 pt, which matches the existing `Button md` h-14. Values marked * are estimates.
- Three slides with one layout. Slide 1 copy comes from the design. Slides 2 and 3 use copy written here, and all three photos are Unsplash placeholders (sample content, replaceable).
- Swiping: a horizontal paging `ScrollView` holds one full-screen photo plus its location pill per slide. The header (wordmark, Skip) and the bottom sheet stay fixed. The sheet's headline and body cross-fade on slide change (Reanimated `FadeIn`/`FadeOut`, `motion.base`), and the active dot moves. Dots are indicators, not buttons.
- Navigation: "Get started" → `/sign-up`. "Continue with Google" → `/sign-in` (Clerk's Google OAuth replaces this later). "Skip" → `/sign-in`, since every feature needs a Clerk session. All three are available on every slide, and "Get started" doesn't step through the slides.
- Auth: stub screens in an `(auth)` route group (`sign-in.tsx`, `sign-up.tsx`) under a Stack, each with a title, a line saying sign-in arrives with Clerk, and a link to the other screen. No Clerk code.
- Routes: onboarding lives at `src/app/onboarding.tsx`. `src/app/index.tsx` becomes `<Redirect href="/onboarding" />`, and the design-system preview moves to `src/app/design-system.tsx` (open with `airbnbrecord://design-system`). Once Clerk lands, index decides between onboarding and home based on the session.
- The onboarding shows on every launch. Remembering that it was seen needs storage, so that comes with Clerk.
- Curved sheet: `react-native-svg` (an Expo SDK package that works in Expo Go), installed with `npx expo install react-native-svg`. A `Path` draws the curved top in `surface` fill. The color comes from a token class through `styled(Path, { className: { target: "style", nativeStyleMapping: { color: "fill" } } })`, so there's no hex.
- Photos: `expo-image` (already installed) with `contentFit="cover"` and remote `images.unsplash.com/photo-…?w=1200&q=80` URLs. Pick three photos during the build (slide 1: a lit cabin deck over a mountain lake at sunset), check that each loads in the simulator, and set each location pill to the photo's real place.
- Skip pill: `GlassView` from `expo-glass-effect` (installed) when `isLiquidGlassAvailable()`, otherwise a `bg-glass` View.
- Location pill: `bg-scrim` with a 1 px `border-scrim-border`, white pin icon and text. No blur, since a tinted GlassView would need a hex tint.
- Status bar: `expo-status-bar` `style="dark"` (the design shows dark text over a light sky).
- Placeholders (marked `// PLACEHOLDER` and listed in the report): the `roam` wordmark is `Text variant="display"`, and the Google "G" is a bold "G" in a 22 pt box. The real assets go in `assets/images/` later.
- Pin icon: the design shows a filled teardrop marker. SF Symbols has none, so the existing `pin` icon is used on iOS (Material `location_on` on Android matches).

### Layout (pt, 430 wide frame)
- Photo: full-screen behind everything (`absolute inset-0`).
- Header row: top = safe-area top + 16 (`pt-4`)*, `px-6`, `justify-between items-center`. Wordmark `display` ink, left. Skip pill: h-11, px-5, `rounded-full`, text `buttonSecondary` ink.
- Location pill: h-10, px-4, gap-2, `rounded-full`, pin 18 `inverse`, `label` `inverse`. It sits `left-6`, 20 pt* above the sheet's top-left edge.
- Sheet: absolute bottom, full width, `bg-surface`. The SVG curve sits on top: 64 pt* tall, with the top-left corner rounded (~24) at y≈0 and the edge falling gently to y≈64 at the right with a large rounded corner (~48)*. Tune against the screenshot. The photo shows through above the curve.
- Sheet content `px-6`, bottom `pb-6` (24 from screen edge, clear of the home indicator):
  - Dots: row `gap-2`, each `h-1.5 w-9 rounded-full`. Active `bg-lavender`, inactive `bg-border`. `pt-7` from the curve's top-left.
  - Headline: `mt-6`, new `hero` variant, ink, two lines.
  - Body: `mt-3`, new `lead` variant, `muted` tone, three lines.
  - Buttons: `mt-4`, `gap-3`. `Button primary` "Get started" with `trailingIcon="arrowRight"`. `Button secondary` "Continue with Google" with the G placeholder as `icon`.

### Copy
1. "Find a stay that fits your story" / "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip." (design)
2. "Just say what you're after" / "Describe your trip in one sentence, like a quiet cabin with a hot tub, and roam ranks the stays that fit."
3. "Answers straight from the stay" / "Ask about check-in, pets or cancellations and see the stay's own rules, word for word, with their source."

### Proposed new tokens (`src/global.css`)
- `--text-hero: 44px*; --text-hero--line-height: 0.9545 (42)*; --text-hero--letter-spacing: -1.5px*` → `Text` variant `hero` (`font-jakarta-bold text-hero`).
- `--text-lead: 17px*; --text-lead--line-height: 1.2941 (22)*` → `Text` variant `lead` (`font-jakarta-medium text-lead`).
- `--color-scrim: rgba(11, 11, 26, 0.45)*` (dark glass pill fill), `--color-scrim-border: rgba(255, 255, 255, 0.35)*`.

## Out of scope
- Clerk, real sign-in/sign-up/Google OAuth, and auth screen designs.
- Remembering that onboarding was seen, and session-based routing.
- Real wordmark and Google logo assets.
- PostHog events for onboarding.
- Auto-advancing slides and tappable dots.

## Steps
### 1. Routes and stubs
Read https://docs.expo.dev/versions/v57.0.0/sdk/router/ (Redirect, groups) first. Move `src/app/index.tsx` to `src/app/design-system.tsx` unchanged. Make `index.tsx` `<Redirect href="/onboarding" />`. In `src/app/_layout.tsx`, set `screenOptions={{ headerShown: false }}` on the root Stack and keep the preview's own `Stack.Screen` title working (give `design-system` `headerShown: true`). Add `src/app/(auth)/_layout.tsx` (Stack, no header), plus `sign-in.tsx` and `sign-up.tsx` stubs: safe area, `px-6`, `heading` title, `body` muted line ("Sign-in with Clerk is coming next."), and a `Link` to the other screen. Add a placeholder `src/app/onboarding.tsx`. Done when launching lands on onboarding and `/sign-in` and `/sign-up` open.

### 2. Tokens and dependency
Add the proposed tokens to `@theme` and the `hero` and `lead` variants to `Text`. Read https://docs.expo.dev/versions/v57.0.0/sdk/svg/, then run `npx expo install react-native-svg`. Lint and tsc pass.

### 3. Onboarding pieces
In `src/components/onboarding/`, add `slides.ts` (id, title, body, image URL, location), `sheet-curve.tsx` (SVG Path, width from `useWindowDimensions`, fill from a token class), `location-pill.tsx`, `page-dots.tsx`, and `google-mark.tsx` (placeholder). Add `src/components/brand/wordmark.tsx` (placeholder). Read the expo-image, expo-glass-effect and expo-status-bar v57 doc pages before using them.

### 4. Onboarding screen
Build `src/app/onboarding.tsx` per Layout: paging `ScrollView` (`pagingEnabled`, `onMomentumScrollEnd` sets the index from `contentOffset.x / width`), fixed header, fixed sheet with cross-fading text keyed by index, and buttons wired to `router.push`. Pick and verify the Unsplash photos here.

### 5. Compare with the design
Screenshot in the iOS simulator (`xcrun simctl io booted screenshot`) and compare slide 1 with the design: wordmark, Skip, photo crop, pill, curve shape, dots, type, spacing, buttons. List each difference, fix it, and repeat. Then swipe to slides 2 and 3 and check that the text fits in two and three lines.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass.
- Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`.
- Simulator: launch → onboarding slide 1 screenshot matches the design (differences listed). Swipe → slides 2 and 3, dots move, text cross-fades. Tap "Get started" → sign-up stub, back. Tap "Continue with Google" → sign-in stub. Tap "Skip" → sign-in stub. The sign-in ↔ sign-up links work. `airbnbrecord://design-system` still opens the preview.
- Long copy check: the headline stays at two lines on an iPhone SE-width simulator (375 pt), or the overflow is noted.

## AGENTS.md updates
- Expo section: the app opens at `/onboarding` through the `index.tsx` redirect, and the design-system preview lives at `/design-system` (replaces the "`src/app/index.tsx` is a temporary design-system preview" rule).
- Who owns what → Auth: auth screens live in the `(auth)` route group, and are stubs until Clerk is set up.
- Design system: SVG shapes use `react-native-svg`, with fill from token classes through `styled` `nativeStyleMapping`.

## Result
Built as planned. Changes made while building:
- Third-party views (`expo-image` `Image`, `GlassView`, `Svg`) ignore `className` until wrapped with `styled(X, { className: "style" })`. `Path` takes its fill through `target: false` with `nativeStyleMapping: { color: "fill" }`, since it has no `style` prop.
- A horizontal `ScrollView` needs `contentInsetAdjustmentBehavior="never"` and explicit page `height`. Otherwise the pages come up short and absolutely placed children sit too high.
- `lead` ended at 16/20 and the Skip pill at h-10 px-4, after comparing screenshots.
- Added an `arrowLeft` icon for the stub screens' back button.
- Photos (free Unsplash License, real photos): slide 1 is a lit cabin on Emerald Lake, BC, at blue hour (the design's label "Whistler, BC" is kept). Slide 2 is an infinity pool at sunset in Jordan, labelled "Aqaba, Jordan" (the city is inferred). Slide 3 is the Tye Haus A-frame with string lights in Skykomish, WA.
- The location pill uses a new `marker` icon (SF `mappin`, Material `location_on`). `pin` (`mappin.and.ellipse`) read as an anchor at 18 pt.
- Dots and copy sit `px-1.5` inside the buttons' edge, as in the design.
Lint, tsc, expo-doctor (18/18) and the drift greps pass. Slide 1 and the routes were screenshotted on the iPhone 17 Pro simulator. Taps and swipes were not exercised, since no tap automation is installed.

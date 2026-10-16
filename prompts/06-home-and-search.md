# 06 · Home and search

Status: done

## Goal
A signed-in guest lands on a Home screen that matches the design. It has a greeting, a one-sentence search prompt, category chips that filter the stays, and large property cards. The app now has native tabs: Home, Search, Trips, Profile. Typing in Home's prompt and sending it opens the Search tab with ranked results from realistic local property data.

## Decisions
- Source: the Home design, attached in chat. Ask for it again when building in a new session. The phone frame is 681 px wide in the image. At a 402 pt frame (iPhone 17 Pro) that's about 1.69 px/pt. Values marked * are estimates.
- Data is local for now: `src/data/properties.ts` holds about 12 typed stays. Sanity replaces this later, and the search parser and ranking become GROQ params and Dataset Embeddings. Keep the `Property` shape close to a future Sanity document: `id, title, type, city, region, rating, reviewCount, pricePerNight, maxGuests, bedrooms, petsAllowed, amenities[], vibes[], description, imageUrl`.
- `type` is one of `cabin | beach | city | villa`. Home's chips map to these, plus "All Stays".
- Photos: remote Unsplash placeholders (`images.unsplash.com/photo-…?w=1200&q=80`), checked to load in the simulator. Card 1 is a lit modern cabin among pines at dusk: "Modern Cabin with Hot Tub", Lake Arrowhead, CA, 4.9.
- Search runs locally in `src/lib/search/` as a pure function: `parseQuery(text)` → `{ maxPrice?, guests?, type?, amenities[], pets?, terms[] }`, then `searchProperties(query)`. Prices ("under $300", "below 250", "$300 a night"), guest counts ("for 4", "4 guests"), type words (cabin, beach, villa, city/apartment/loft), amenities (hot tub, pool, fireplace, wifi, kitchen, sauna, ocean view…) and pets ("pet friendly", "dog") are parsed in code. They filter. The remaining words are soft terms (quiet, cozy, secluded…) and they rank by overlap with `vibes` and `description`. Ties break by rating. This is a stand-in, not the AI pipeline: no Jev or GROQ in this feature.
- Empty query → all stays by rating. No matches → an empty state that lists the parsed constraints and has a "Clear search" button.
- Navigation: sending the prompt (keyboard return or the arrow button) calls `router.navigate({ pathname: "/search", params: { q } })`. The search icon button next to the headline goes to `/search` with no query. Search reads `q` with `useLocalSearchParams` and puts it in its own prompt, and searching again there updates `q` with `router.setParams`.
- Search screen (no design, built from Home's pieces): the same prompt bar at the top, holding the query and focused when opened empty. A result line follows ("6 stays", `caption` muted). Then the same property cards. Cards don't navigate yet, and the chevron is decorative (`accessibilityElementsHidden`).
- Tabs: `NativeTabs` from `expo-router/unstable-native-tabs` in `src/app/(app)/_layout.tsx`, replacing the Stack. Four plain triggers, all without `role="search"`, since the design keeps Search inside the bar: Home `house`/`house.fill` (md `home`), Search `magnifyingglass` (md `search`), Trips `calendar` (md `calendar_today`), Profile `person`/`person.fill` (md `person`). Selected tint is `ink`. Colors come from tokens through `useUnstableNativeVariable("--color-ink")` from `nativewind`, never a hex. If that hook doesn't resolve, use `styled(NativeTabs)` with `nativeStyleMapping`. Add a `ThemeProvider value={DefaultTheme}` per the router skill.
- **Known deviation:** on iOS 26 the native tab bar is the system Liquid Glass capsule, so the selected tab gets the system highlight instead of the design's yellow circle. You chose native tabs over a hand-built bar, so this deviation is accepted.
- Trips: placeholder empty state (calendar icon, "No trips yet", muted line). Profile: avatar, name, email, and the Sign out button (moved from the old Home stub). Both screens are padded for the safe area.
- Greeting: "Hey, {user.firstName} 👋" from Clerk (sign-up collects the first name). Without a first name it shows "Hey there 👋". Avatar: Clerk `user.imageUrl` through `expo-image` on a `primary-soft` circle. Without an image it shows the initial in `heading`.
- `expo-haptics` (Expo module, works in Expo Go), installed with `npx expo install expo-haptics`. It fires `selectionAsync()` when the chip selection changes and `impactAsync(Light)` when a search is sent. Each fires once per action, in the same frame as the visual. Failures are ignored.
- Card legibility: a bottom gradient over the photo using Tailwind v4 `bg-linear-to-t from-ink/70 to-transparent` (react-native-css compiles `linear-gradient` to `experimental_backgroundImage`). If it doesn't render, use a `bg-scrim` View on the lower half.
- Screens are a `ScrollView` as the first child, so iOS tab-bar insets apply automatically. The list holds about 12 items, so it isn't virtualized and layout animations on rows are safe.

### Motion (per the expo-animation skill)
| What | Gate / purpose | Implementation |
| --- | --- | --- |
| Press on cards, chips, prompt arrow, search button | tens/day · feedback | New `PressableScale` primitive: Reanimated CSS transition on `transform`, scale 0.97, 120 ms, `cubicBezier(0.23, 1, 0.32, 1)`. `hitSlop`, `pressRetentionOffset={16}` |
| Chip selected ↔ unselected | tens/day · state indication | CSS transition on `backgroundColor`, 150 ms, same curve |
| Category filter changes the list | occasional · preventing a jarring change | Card wrappers `entering={FadeIn.duration(200)}`, `exiting={FadeOut.duration(150)}`, `layout={LinearTransition.duration(250).easing(EASE_IN_OUT)}`, builders at module scope |
| Search results arrive | occasional, waited-on · spatial consistency | `FadeInDown.duration(250).delay(index * 40)`, capped at index 6, keyed by query so each new search replays |
| Prompt arrow enabled when text is non-empty | state indication | CSS transition on `opacity` (0.4 → 1), 150 ms |
| Tab switches | 100+/day | **None**, native |
| Home entrance on every visit | tens/day | **Rejected**: content the guest sees all day should already be there |

Reduced motion: layout builders get `.reduceMotion(ReduceMotion.System)`. `PressableScale` drops the scale when `useReducedMotion()` is true, and color and opacity transitions stay. Add the curve and press values to `src/theme/motion.ts` (`easeOut`, `easeInOut`, `press: { scale: 0.97, duration: 120 }`, `stagger: 40`), and replace the old `spring` mass/stiffness token with `{ duration: 400, dampingRatio: 1 }`. Check that nothing uses the old one first.

### Layout (pt, 402 wide frame)
- Screen `bg-surface`, `px-5`* (20). ScrollView content: top = safe-area top + 8*, bottom `pb-8`.
- Header row (`flex-row justify-between items-start`): `Wordmark size="lg"` (display 56). Avatar `size-22` (88)* `rounded-full bg-primary-soft`, image `cover`.
- `mt-3`*: greeting `title` (20), tone `muted`.
- Headline row (`flex-row items-center gap-4`, `mt-1`): "Find your\nnext stay" in `hero`, `flex-1`. The search button is a `w-16 h-22`* (64×88) `rounded-xl bg-surface-muted` tall pill with the `search` icon at 26*.
- Prompt bar `mt-5`*: `h-16` (64)* `rounded-full bg-lavender pl-5 pr-2 flex-row items-center gap-3`. `sparkles` icon 24 ink, `TextInput` `flex-1` (`font-jakarta-medium text-label text-ink`, placeholder "quiet pet friendly cabin with hot tub" in `ink-muted`*, `returnKeyType="search"`, `submitBehavior="blurAndSubmit"`), arrow button `size-12` `rounded-full bg-surface` with `arrowUpRight` 22.
- Chips `mt-5`*: `flex-row flex-wrap gap-2`. Each is `h-12` (48), `px-5`*, `gap-2`, `rounded-full`, no border. Selected `bg-primary`, otherwise `bg-surface-muted`. Icon 22 (filled glyphs), label `label`. Order: All Stays (`homeFill`), Cabins (`cabin`), Beach (`beach`), City (`city`), Villas (`villa`).
- Cards `mt-7`*, `gap-5`*: full width, `h-68` (272)*, `rounded-xl` (24)*, `overflow-hidden`. Photo fills the card, with the gradient on the lower 60%.
  - Rating pill: absolute `top-3 right-3`, `h-10 px-4 gap-1.5 rounded-full bg-surface`, star 18 ink, `subtitle` "4.9".
  - Bottom block: absolute `left-5 right-20 bottom-5`*. Row: `marker` 18 inverse plus `caption` inverse "Lake Arrowhead, CA". Then `heading` inverse title, at most two lines.
  - Chevron: absolute `right-4 bottom-4`*, `size-14` `rounded-full bg-surface`, `chevronRight` 24.
- Search screen: same padding. Prompt bar at top (safe-area top + 8), result line `mt-4`, cards `mt-4 gap-5`.

### Proposed new tokens and registry entries
- No new colors, sizes or radii: everything maps to existing tokens. `h-22`/`w-16`/`size-22` come from the 4 px spacing scale.
- Icons (`src/components/ui/icons.ts`): `sparkles` (ios `sparkles`, md `auto_awesome`), `arrowUpRight` (ios `arrow.up.right`, md `north_east`), `homeFill` (ios `house.fill`, md `home`). Chip glyphs switch to filled variants where SF has them: `cabin` → `tree.fill`, `city` → `building.2.fill`. The Material equivalents are unchanged. Neither SF Symbols nor Material has a palm tree, so `villa` stays `beach.umbrella` (iOS) and `villa` (Material) as marked substitutes.
- `Chip` gets `variant: "outline" | "filled"` (filled = `bg-surface-muted`, no border). The default stays `outline` so existing screens don't change. Chip press uses `PressableScale`.

## Out of scope
- Stay detail screen and card navigation, and favorites/bookmarks.
- Sanity content, GROQ, embeddings, Jev, and API routes. Data stays local.
- Real Trips and Profile designs. Dates, guests pickers, map view.
- PostHog events.
- A custom tab bar for the yellow selected circle.
- Real wordmark asset (still the `Wordmark` placeholder).

## Steps
### 1. Tabs and placeholder screens
Read https://docs.expo.dev/versions/v57.0.0/sdk/router-native-tabs/ (or the current NativeTabs page linked from https://docs.expo.dev/llms.txt) first. Replace `src/app/(app)/_layout.tsx`'s Stack with `NativeTabs` per Decisions. Add `search.tsx`, `trips.tsx` and `profile.tsx` in `src/app/(app)/`. Move Sign out into Profile. Keep `index.tsx` redirecting to `/home`. Done when all four tabs show, switching works, and Sign out from Profile lands on onboarding.

### 2. Data, search, tokens, dependency
Run `npx expo install expo-haptics` after reading its v57 doc page. Add `src/data/properties.ts` (about 12 stays across all four types, prices $95–$850, varied guests, pets, amenities and vibes, realistic US and international places, Unsplash photos). Add `src/lib/search/parse.ts` and `src/lib/search/search.ts` as pure functions. Add the icons, the `Chip` variant and the motion tokens. Check by hand with a few inputs (see Verification), and lint and tsc pass.

### 3. Shared pieces
Add `src/components/ui/pressable-scale.tsx` (export from `index.ts`). Add `src/components/stays/property-card.tsx`, `src/components/stays/search-prompt.tsx` (the lavender bar, controlled `value`/`onChangeText`/`onSubmit`, `autoFocus` prop) and `src/components/home/category-chips.tsx`. Promoting to `ui/` waits until the pattern recurs. Wrap any third-party view that needs `className` with `styled`.

### 4. Home screen
Rewrite `src/app/(app)/home.tsx` per Layout and Motion. The selected category filters `properties` in memory, and the cards animate in and out. Sending the prompt fires the haptic and navigates to Search with `q`, and the search button goes to Search empty.

### 5. Search screen
Build `src/app/(app)/search.tsx`: sync the prompt from `q`, run `searchProperties`, and show the result line and staggered cards. Show the empty state for no matches. Searching again updates `q`.

### 6. Compare with the design
Screenshot Home on the iPhone 17 Pro simulator (`xcrun simctl openurl booted airbnbrecord://home`, `xcrun simctl io booted screenshot`). Compare wordmark, avatar, greeting, headline, search pill, prompt bar, chips, card (photo crop, pill, gradient, type, chevron) and tab bar. List each difference, fix it, and repeat. Screenshot Search with a query (`airbnbrecord://search?q=quiet%20pet%20friendly%20cabin%20with%20hot%20tub`) and an empty result.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass.
- Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`.
- Search checks (log `parseQuery` output and top results for each): "quiet pet friendly cabin with a hot tub under $300 a night" → only pet-friendly cabins with a hot tub at or under $300, quiet ones first. "beach house for 6" → beach stays sleeping 6 or more. "villa with pool" → villas with a pool. "city loft under 150" → city stays at or under $150. "cozy" → everything, cozy ones first. "igloo on the moon under $10" → empty state.
- Simulator: Home matches the design (differences listed). Tapping chips filters with the fade and reflow. Typing a sentence and pressing the arrow opens Search with ranked results. A new search there replays the stagger. The search button opens Search with the field focused. Trips and Profile show, and Sign out works. Tab switches don't animate.
- Images: every property photo loads (no blank cards).
- Reduced motion (Settings → Accessibility → Reduce Motion): no scale, fades only.
- Not judgeable here: feel on a release build and on a slow Android device, and haptics (the simulator has none). These are reported as ❌.

## AGENTS.md updates
- Design system → Route protection: `(app)` is a `NativeTabs` group (Home, Search, Trips, Profile). Sign out lives in Profile.
- Who owns what → Content: until Sanity is seeded, stays come from `src/data/properties.ts` and search is a local parser and ranker in `src/lib/search/`. These are replaced by GROQ filters and embeddings.
- Design system: pressables use `PressableScale` (0.97, 120 ms), motion curves live in `src/theme/motion.ts`, tab switches never animate, and layout animation builders live at module scope with `ReduceMotion.System`.
- Expo: `expo-haptics` is used once per action and never as the only feedback.

## Result
Built as planned. Changes made while building:
- New token `--text-jumbo` (52 px*, line height 0.9, letter spacing -2 px*) and `Text` variant `jumbo` for the Home headline. Neither `display` nor `hero` matched the design. A line height of 0.85 clipped the cap tops on iOS.
- The prompt's arrow is always active. With nothing typed it sends the suggestion shown as the placeholder (in `ink`, as in the design), so the planned opacity transition was dropped. Return only submits typed text.
- The prompt `TextInput` has no `text-*` size class. Its line height made iOS draw a second line in a single-line input. RN's default 14 pt matches `caption`.
- `PressableScale` is a `Pressable` wrapping an `Animated.View` (the skill's recipe). `styled(Animated.createAnimatedComponent(Pressable))` blew up TypeScript (TS2589). Cards don't navigate yet, so they get no press feedback.
- `Chip` padding moved into variants (outline `px-6`, filled `px-4`), so no screen passes a second `px-*` class.
- The avatar uses `user.hasImage`, so Clerk's generated default image falls back to the initial on `primary-soft`.
- Home's first render skips card entrances through `LayoutAnimationConfig skipEntering`, so only category changes animate.
- Titles were shortened so they fit the design's two-line block (`right-32`). Villa chips use `beach.umbrella.fill`.
- 16 stays, with all Unsplash photos checked (HTTP 200 and viewed).
- The 👋 shows as a "?" box in this iOS 26 simulator. Safari on the same simulator shows the same box, so it's a simulator font issue, not the app.
Lint, tsc, expo-doctor (18/18) and the drift greps pass. Home, Search (results and empty), Trips and Profile were screenshotted on the iPhone 17 Pro simulator. Taps, haptics and motion feel were not exercised (no tap automation).

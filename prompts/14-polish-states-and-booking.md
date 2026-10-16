# 14 · Polish, states and booking placeholder

Status: done

## Goal
Make several small fixes and add loading behavior across Home, Search and stay details:
- Home search bar: a clearer icon, and a shorter, dimmer placeholder.
- The Home greeting no longer shows a broken emoji.
- Search result cards get room between their content and their bottom edge.
- The host appears right on the stay screen, not in a sheet.
- "Book this stay" opens a placeholder trip-summary screen.
- Empty and error states explain what happened and offer a next step.
- Loading placeholders pulse.
- Home, Search and stay details can be pulled to refresh.

## Decisions
- **No design attached.** Everything uses existing tokens and patterns: Good to know rows, `PolicyCard`, `PriceBar`, the Ask header and the Trips empty state. No new color, type, radius or shadow tokens.
- **Home search icon (your answer):** the `SearchPrompt`'s leading `sparkles` becomes the plain `search` glyph (`magnifyingglass` / `search`), size 24, tone `ink`. The send button (`arrowUpRight`) is unchanged.
- **Placeholder (your answer):** `PROMPT_SUGGESTION` becomes `"cabin with a hot tub"`. Sending with nothing typed still searches it. The placeholder color changes from `placeholder:text-ink` to `placeholder:text-ink/50`, the ink token at 50%, about 3:1 contrast on lavender. If NativeWind ignores the opacity modifier on `placeholder:`, fall back to `placeholder:text-ink-muted` and say so.
- **Greeting:** "Hey, Sujata 👋" shows a "?" box because Plus Jakarta Sans has no emoji glyph and iOS doesn't fall back. The emoji is replaced with a new `wave` icon (`hand.wave.fill` / `waving_hand`), size 22, tone `primary`, placed after the text in a `flex-row items-center gap-1.5`. It is hidden from VoiceOver, which reads "Hey, Sujata".
- **Result card spacing:** the card's shadow edge runs right under "$289 / night" because the image (152 pt) and the details column are the same height. The details column gets `pb-3`. The image changes from `h-38` to `min-h-40 self-stretch` (160 pt, grows with large text), so the card is 160 pt and the price sits 12 pt above the edge. `ResultCardSkeleton` follows (`h-40`).
- **Host on screen:** the Host form sheet (`src/app/stay/[slug]/host.tsx` and its `Stack.Screen`) is removed. A "Meet your host" section replaces the host row at the bottom of the details body, with a divider above it:
  - It follows the Good to know pattern: a `title` heading, then a row with the `md` avatar (with `border-2 border-surface shadow-raised`), the `subtitle` name and the Superhost line.
  - Then the full `bio` (`body`), then fact rows. Each fact row is icon 20 + text, `gap-3`, `gap-2.5` between rows: `calendar` "Hosting since May 2019", `clock` "Responds within an hour", and a new `globe` icon (`globe` / `language`) "Speaks English and Spanish".
  - `hostFacts` returns `{ key: "since" | "response" | "languages", text }[]`, so each fact gets its icon. Missing fields are left out, as now.
  - `HostRow` is replaced by `HostSection` (`src/components/stay/host-section.tsx`). `SuperhostLine` stays. The `stay_host_opened` event goes away.
- **Book screen (your answer: trip summary):**
  - Route: `src/app/stay/[slug]/book.tsx`, pushed over the tabs like `ask`, registered in the root Stack inside the signed-in guard. "Book this stay" pushes it with no Alert and no haptic (the push is the feedback). `stay_book_tapped { slug }` stays.
  - Header: the same as Ask's, a `chevronLeft` `IconButton size="nav"` + `title` "Confirm your stay".
  - Body, a ScrollView with `px-5 pt-5`:
    1. **Stay row:** the first photo (`w-28 h-24 rounded-md`, expo-image via `styled`), then `cardTitle` title (2 lines), `caption` subtle place with `marker`, and a `star` + `label` rating "4.9 (214)".
    2. Divider (`h-px bg-border`, `my-5`).
    3. **Your trip** (`title`): a Dates row ("Dates", subtle "Add dates") and a Guests row ("Guests", subtle "Up to {maxGuests} guests", or "Add guests" if unknown). Each row has a trailing `Badge label="Coming soon"`.
    4. Divider.
    5. **Price details** (`title`): "$289 × 2 nights" … "$578"; "Cleaning fee" … "$95" (only if set); a divider; then "Total" … "$673" in `subtitle`. Values come from `stayTotal` plus a new `priceLines(stay)` in `src/lib/stay-details.ts`, with the same thousands formatting as `PriceBar`.
    6. Divider.
    7. **Cancellation** (`title`): the existing `PolicyCard icon="policy"` with the policy's title and summary word for word. It opens the Policies sheet at `section=cancellation`. It's hidden if the stay has no cancellation policy.
  - Pinned bottom bar, like `PriceBar` (`border-t`, safe-area padding): a disabled `Button size="lg"` "Confirm and pay", with a `caption` muted line under it: "Booking opens soon. You can't book stays in Roam yet."
  - States: the stay is normally already cached. Loading shows a pulsing skeleton. Not found and error use the shared states below.
  - Data: `maxGuests` is added to `STAY_QUERY` and `StayDetails` (`number | null`). The field already exists on `property`, so the schema doesn't change.
- **Empty and error states:**
  - **`EmptyState`, a new `src/components/ui/empty-state.tsx`:** props `icon`, `title`, `message`, optional `action { title, onPress }`, optional `secondaryAction`, optional `children` (shown between message and actions), `className`, `style`.
    - Layout: `items-center gap-3 px-6`. An icon tile `size-18 rounded-full bg-surface-muted` holds the icon at 32. Then the `title` heading, the `body` muted message (`text-center`), any children, then the buttons (`Button size="sm"`, the main one `variant="primary"`, the secondary one `variant="secondary"`, in a `flex-row gap-3`, `mt-2`).
    - `accessibilityLiveRegion="polite"`.
    - It fades in (`FadeIn` 200 ms ease-out, `ReduceMotion.Never`, since it's opacity only).
    - It's a ui primitive because Home, Search, stay, Book, Ask, Policies and Trips all use it.
  - **`LoadError`, a new `src/components/load-error.tsx`:** `{ error, subject, onRetry }` picks copy by cause.
    - Can't connect: a `SanityError` with status 0 and "Network error", or a `TypeError` from `fetch`. Icon `wifiOff` (`wifi.slash` / `wifi_off`), title "Can't connect", message "Check your connection and try again."
    - Anything else (a server status, or Jev or Context failing behind `/api/search`): icon `warning` (`exclamationmark.triangle` / `warning`), title "Something went wrong", message "We couldn't load {subject} right now. Try again in a moment."
    - Action: "Try again".
  - **Copy per screen:**
    - Home, empty category: the category's own icon (exported from `category-chips.tsx`), "No stays here yet" / "Try another category, or describe your stay above." It offers "Show all stays" (sets category to `all`) when the category isn't `all`.
    - Home, error: `LoadError subject="stays"`.
    - Search, no results: icon `searchOff` (`text.magnifyingglass` / `search_off`), "No stays match that yet".
      - If the search had hard constraints, it shows "Every stay has to meet these:" and the existing constraint badges as children.
      - Then "Try one of these:" with 3 suggestion `Chip`s that each run a new search: "cabin with a hot tub", "beach house under $400" and "city apartment with a workspace". Each is checked to return results during build, and swapped if it doesn't.
      - Action: "Clear search".
    - Search, error: `LoadError subject="stays"`.
    - Stay, not found: icon `pinOff` (`mappin.slash` / `wrong_location`, checked at build), "This stay isn't available", "It may have been removed by its host.", action "Back".
    - Stay, error: `LoadError subject="this stay"`. The back button stays on top.
    - Ask, Policies and Book use the same not-found and `LoadError` states. Their "Loading…" text becomes a centered spinner (`ActivityIndicator`, token color through `styled`), since those screens are almost always cached.
    - Trips switches to `EmptyState` (calendar, "No trips yet", "Stays you book will show up here.", action "Explore stays" → `/home`).
  - **`Can't refresh`:** when content is already on screen and a pull to refresh fails, the content stays. A dismissible `Alert tone="danger"` reads "Couldn't refresh. Showing what you had." at the top of the list (Home: above the cards; Search: above the count row; stay: at the top of the white body).
- **Loaders (your answer: pulsing skeletons):**
  - **`Skeleton`, a new `src/components/ui/skeleton.tsx`:** an `Animated.View` with `bg-surface-muted` plus layout classes. Its opacity pulses 1 → 0.5, alternating forever, using a Reanimated CSS animation (`animationName` keyframes at module scope, `animationDuration: motion.pulse` (900), `animationDirection: "alternate"`, `animationIterationCount: "infinite"`, and the new `motion.cssEaseInOut`). With Reduce Motion it's static. Check the CSS animation API against the Reanimated 4.5 docs at build.
  - Home's placeholder cards, `ResultCardSkeleton`, `StaySkeleton` and the Book skeleton all use it.
  - **Search:** while the first results for a request load, the count row reads "Finding stays…" (`lead`, muted) above the skeletons, in the same spot "5 stays" will take. When a chip or sort change is waiting, the results stay on screen and the count row reads "Updating…" until the new results land. The hook exposes `pending`.
- **Pull to refresh:** `RefreshControl` (native) on Home, Search and stay details, with the system spinner color (no hex).
  - Each hook gets `refresh(): Promise<void>` and `refreshing`. It refetches the current request without the cache. On success it replaces the cache entry and the state. On failure it sets `refreshError` and keeps the content.
  - With an error and no content, pulling acts as Try again.
  - **Search refresh** re-sends the current request. Once the sentence has been read, that's `{ intent }`, so Jev doesn't run again.
  - **Stay details:** the spinner shows above the photo once it's pulled far enough. If it sits under the Dynamic Island, that's noted rather than worked around.
  - **Hooks keep their data in state keyed by request**, like `useStay`. `useHomeStays` and `useSearchStays` currently read `cache.get(...)` during render, which the React Compiler memoizes, so a refreshed cache entry would never show. They switch to `const current = loaded?.key === key ? loaded.data : cache.get(key)`, still keeping the previous list on screen while a new request loads.
- **Motion:**

  | What | Tier / purpose | Implementation |
  | --- | --- | --- |
  | Skeleton pulse | loading / state indication | CSS animation on opacity, 900 ms alternate, ease-in-out; off with Reduce Motion |
  | Empty and error states | occasional / prevents a jarring change | `FadeIn` 200 ms ease-out, opacity only |
  | Pull to refresh | user action / feedback | native `RefreshControl` |
  | Book screen | spatial | native stack push |
  | Search "Updating…" | state indication | text swap, no animation |

- **PostHog:** a new `stays_refreshed { screen: "home" | "search" | "stay" }`, and `search_suggestion_tapped { index }`. Suggestion text is Roam's own copy, but it's sent as an index anyway. `stay_host_opened` is removed.

### New registry entries (no new design tokens)
- Icons:
  - `wave`: `hand.wave.fill` / `waving_hand`
  - `globe`: `globe` / `language`
  - `wifiOff`: `wifi.slash` / `wifi_off`
  - `warning`: `exclamationmark.triangle` / `warning`
  - `searchOff`: `text.magnifyingglass` / `search_off`
  - `pinOff`: `mappin.slash` / `wrong_location`

  The iOS names exist in `sf-symbols-typescript`. Android names are checked against `expo-symbols`' list, and tsc enforces both.
- `motion.pulse: 900`, `motion.cssEaseInOut: cubicBezier(0.77, 0, 0.175, 1)` in `src/theme/motion.ts`.
- `size-18` is the 4 pt grid (72), not a new token.

## Out of scope
Real booking, dates and a guest picker. Payments. Trips data. Persisted favorites. Offline detection with NetInfo (errors are classified from the failed request instead). A refresh on Ask or Policies. Changes to the Sanity schema or content.

## Steps
### 1. Primitives and registry
Add the six icons to `src/components/ui/icons.ts`, `pulse` and `cssEaseInOut` to `src/theme/motion.ts`, and `Skeleton` and `EmptyState` in `src/components/ui/`, exported from `index.ts`. Add `src/components/load-error.tsx`. Add a "States" section to `/design-system` showing a skeleton, an empty state and both `LoadError` variants. Lint and tsc pass.

### 2. Hooks: state-backed data, refresh, pending
Rework `useHomeStays` and `useSearchStays` to keep data in state keyed by request (see Decisions), and add `refresh`, `refreshing`, `refreshError` and `clearRefreshError` to them and to `useStay`. `useSearchStays` also exposes `pending` (the current key has no result yet while older results are shown). Add `maxGuests` to `STAY_QUERY` and `StayDetails`. Change `hostFacts` to keyed facts and add `priceLines`. Check `STAY_QUERY` for `modern-cabin-with-hot-tub` through the Sanity MCP. Lint and tsc pass.

### 3. Home
- Search prompt: change the icon, `PROMPT_SUGGESTION` and the placeholder class.
- Greeting: replace the emoji with the `wave` icon.
- States: `Skeleton` cards, the empty-category `EmptyState` with "Show all stays", `LoadError`, `RefreshControl`, and the refresh-failure `Alert`.
- Export the category icon map from `category-chips.tsx`.

### 4. Search
- Result card: card spacing (`pb-3`, `min-h-40 self-stretch` image) and its skeleton.
- Count row: "Finding stays…" and "Updating…".
- States: the no-results `EmptyState` with constraint badges and suggestion chips, which set `q` like a submitted search and fire `search_suggestion_tapped`. Plus `LoadError`, `RefreshControl` and the refresh-failure `Alert`.

### 5. Stay details and host
- Add `HostSection` and remove `HostRow`, `host.tsx` and its `Stack.Screen`. Update the design-system page to show `HostSection`.
- Details screen: pulsing `StaySkeleton`, the not-found `EmptyState`, `LoadError`, `RefreshControl` and the refresh-failure `Alert`.
- "Book this stay" pushes `/stay/[slug]/book`.

### 6. Book screen
Add `src/app/stay/[slug]/book.tsx` as described in Decisions and register it in `src/app/_layout.tsx`.

### 7. Ask, Policies and Trips
Ask and Policies: spinner for loading, plus the shared not-found and error states. Trips: switch to `EmptyState`.

### 8. Simulator pass
Screenshot each state and compare it with this plan:
- Home (`exp://127.0.0.1:8081/--/home`): greeting, prompt and placeholder.
- An empty category: there's no empty category in the data. Force one temporarily in code, screenshot it, and revert.
- Search results (`/search?q=cabin%20with%20hot%20tub`): card spacing.
- Search with no results (`/search?q=treehouse%20in%20antarctica%20under%20%2450`).
- Stay details scrolled to Meet your host.
- Book (`/stay/modern-cabin-with-hot-tub/book`).
- Not found (`/stay/nope`).
- Error states: force them by temporarily pointing the hooks at a bad URL, then revert.
- Pull to refresh on Home, Search and a stay (drag with `xcrun simctl` isn't available, so check that it renders and call `refresh` from a temporary button only if needed).

List every difference, fix it, and repeat.

## Verification
- `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` pass.
- Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`. No `👋` left in `src/`.
- Home: the greeting shows the wave icon, not "?". The placeholder reads "cabin with a hot tub" and is visibly dimmer than typed text. The leading icon is the magnifier. Sending with nothing typed opens Search for "cabin with a hot tub".
- Search: there's visible space between each card's price and its bottom edge. "Finding stays…" shows on a fresh search. Toggling a chip shows "Updating…" and then the new count. The no-results state shows the constraint badges, and each suggestion chip returns results. Clear search works.
- Stay: "Meet your host" shows the name, Superhost line, bio and the three facts for Lake Arrowhead (Maya). The `/stay/x/host` route is gone. "Book this stay" opens Confirm your stay with $289 × 2 nights = $578, cleaning $95, total $673, matching the price bar. Confirm and pay is disabled. The cancellation card opens Policies at cancellation.
- States: the not-found screen, both error variants (Can't connect, Something went wrong) with a working Try again, and pulsing skeletons, which are static with Reduce Motion (Simulator → Accessibility → Reduce Motion).
- Pull to refresh: the spinner appears and the content reloads (counted with a temporary log of fetches, removed afterwards). A forced refresh failure keeps the content and shows the Alert.
- Not judgeable here: real-device feel of the pulse, Android rendering, and pull-to-refresh by finger in the simulator (if it can't be driven). These are reported as ❌ with the reason.

## AGENTS.md updates
- Design system:
  - Replace "`policies` … and `host` are form sheets" with: `policies` is a form sheet; the host shows inline ("Meet your host"); `book` is pushed over the tabs and is a placeholder trip summary with Confirm disabled until booking exists.
  - Add: empty and error states use `EmptyState` (ui) and `LoadError` (copy by cause: can't connect vs something went wrong). Loading uses pulsing `Skeleton` (CSS animation, static with Reduce Motion).
  - Add: Home, Search and stay details pull to refresh with `RefreshControl`. A failed refresh keeps the content and shows a dismissible danger `Alert`.
- Design system, hooks line: data hooks key their state by request, expose `refresh()`, and never read the module cache as the source of truth during render.
- Design system: emoji don't render in Plus Jakarta Sans, so use an `Icon` instead.

## Result
Built as planned. Changes made while building:
- Added `Spinner` (`src/components/ui/spinner.tsx`) for the Ask and Policies loading states. `Button` now uses it instead of its own styled `ActivityIndicator`.
- Book's note is "Booking opens soon in Roam." The planned two-sentence note wrapped with a lone "yet." on the second line.
- With no hard constraints, the no-results message is "Try describing your stay another way." It used to also say "start from one of these", which repeated the "Try one of these:" label.
- `useHomeStays` and `useSearchStays` keep a `shown` state as well as the request-keyed `loaded` one. Switching A → B (cached) → C now keeps B on screen while C loads, not A.
- `formatPrice` was added next to `priceLines` in `src/lib/stay-details.ts`.

Lint, app tsc, expo-doctor 18/18 and the drift greps pass. tsc also reports 213 errors, all in the untracked `agent/skills/…` reference app.

Simulator screenshots:
- Home: greeting with the wave icon, magnifier, dimmed "cabin with a hot tub".
- Search: results with card spacing, "Updating…" over earlier results, no results with badges and suggestions. Each suggestion returns 5, 6 and 7 stays.
- Stay: Meet your host.
- Book: totals match the price bar.
- Stay not found, and Trips.
- Home: Can't connect, Something went wrong, and pulsing skeletons (pixel sampled between #f4f5f7 and #f9fafb).
- Home refresh: a failed refresh keeps the cards and shows the Alert. A successful refresh replaces the list.

Not exercised:
- Pull to refresh by finger (no touch automation; `refresh` was driven from a temporary timer).
- The empty-category "Show all stays" button (no tap automation, and no category is empty in the data).
- Reduce Motion, Android, and the stay and search error states on screen (they render the same `LoadError`).

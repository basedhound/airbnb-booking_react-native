# 15 · Profile

Status: done

## Goal
The Profile tab matches the attached Profile design, wired to Clerk. It shows:
- The guest's photo, name and location.
- Their Saved count.
- The Account and Preferences rows.
- Roam's guest refund policy.

Personal info edits the guest's name and location in Clerk. Sign out sits below the fold.

## Decisions
- **Source:** the Profile design is attached in chat. Ask for it again when building in a new session. The phone frame is 778 px wide in the image, which is 1.935 px/pt at a 402 pt frame (iPhone 17 Pro). Values marked * are estimated from the image. The mockup has no status bar, so content starts under the safe area, as on Home.
- **Profile data (your answer: real data):**
  - Name: `user.fullName`, else `firstName`, else the part of the primary email before "@", else "Roam guest".
  - Photo: `user.imageUrl` when `user.hasImage` (Google and Apple sign-ins have one). Otherwise the initial on `primary-soft`, as `Avatar` already does.
  - Location: `user.unsafeMetadata.location`. It's shown only if it's a non-empty string, and the line is hidden until the guest sets it in Personal info.
  - Badge: "Roam Explorer" for every guest (static label).
  - Stats: Trips `0`, Saved = live count of stays hearted this session (a new `useFavoriteCount()` in `src/lib/favorites.ts`), Rating = star + "New".
  - Trips stays 0 until booking exists; Rating stays "New" until guests are rated. Neither has data in Roam yet.
- **Rows (your answer: Personal info edits Clerk):**
  - The gear and Personal info both open `/account/personal-info`.
  - Trips calls `router.navigate("/trips")`.
  - Payment methods, Notifications and Help & support open `/account/[topic]` (`payments`, `notifications`, `help`), a "Coming soon" screen.
- **Personal info screen** (`src/app/account/personal-info.tsx`, pushed over the tabs, no design: built from existing patterns):
  - Header: like Ask's (`chevronLeft` `IconButton size="nav"` + `title` "Personal info").
  - Fields: three `TextField label` fields: "First name" (required, trimmed, ≤ 50), "Last name" (optional, ≤ 50), "Location" (optional, ≤ 60, placeholder "City, region"). Then a read-only Email block: `label` muted "Email", `body` the address, and `caption` subtle "Email changes aren't available in Roam yet."
  - Save button: `Button` "Save", full width. It's disabled until something changes, and `loading` while saving.
  - **Saving** calls `user.update({ firstName, lastName })` when either name changed. For a changed location it calls `user.updateMetadata({ unsafeMetadata: { location: value || null } })` (deep merge; `null` removes the key). In `@clerk/expo` 4.8.1, `user.update({ unsafeMetadata })` is deprecated.
  - **On success:** a `notificationAsync(Success)` haptic, then `router.back()`.
  - **On failure:** the draft stays, an inline `Alert tone="danger"` reads "Couldn't save your changes. Try again.", and Save can be pressed again.
  - Clerk instance check: first and last name are enabled (not required), and email is required (checked via `/v1/environment`).
- **Coming soon screens** (`src/app/account/[topic].tsx`): a header like Personal info, titled "Payment methods", "Notifications" or "Help & support", over a centered `EmptyState`:

  | Topic | Icon | Title | Message | Action |
  | --- | --- | --- | --- | --- |
  | payments | `card` | "Coming soon" | "You'll add payment methods here once booking opens in Roam." | none |
  | notifications | `bell` | "Coming soon" | "Notification settings will live here." | none |
  | help | `help` | "Coming soon" | "In-app support is on the way. Roam's policies answer most questions." | "Read Roam's policies" → `/policies` |

  An unknown topic shows `EmptyState` `pinOff` "This page isn't available" + Back.
- **Sign out (your answer: bottom of Profile):** a secondary `Button` "Sign out", full width, `mt-6`, under the policy card. It keeps today's behavior: the `signed_out` event, a PostHog flush capped at 2 s, then `signOut()`. The root guard does the navigation.
- **Policy card (your answer: guest refund policy):**
  - It shows the `guestRefund` policy's `title` ("Guest refund policy") and `summary` word for word, through the existing `PolicyCard` (lavender, `policy` icon, no tile).
  - Tapping opens a new **Roam policies sheet** `/policies?section=guest-refund` that lists all 8 of Roam's policies, word for word, scrolled to that one.
  - While loading it's a `Skeleton` of the card's size. If loading fails, the card is left out (the rest of Profile doesn't depend on it).
- **Roam policies sheet** (`src/app/policies.tsx`, form sheet like the stay's `policies`: grabber, detents `[0.6, 1]`, `sheetExpandsWhenScrolledToEdge`):
  - Content: `heading` "Roam's policies", then each policy's `title` and `PolicyBody`. Cancellation tiers come first (flexible, moderate, strict), then check-in, pets, payment, damage, guest refund.
  - Footnote: "These are Roam's policies, shown as written. Questions? Contact Roam support."
  - `section` is a policy slug: measure it with `onLayout` and scroll to it once.
  - States: `Spinner`, `LoadError subject="Roam's policies"`, and empty ("No policies yet").
  - Data: `ROAM_POLICIES_QUERY` (`*[_type == "policy"]{ "slug": slug.current, kind, title, summary, body }`) in `queries.ts`. Hook `src/hooks/use-roam-policies.ts` follows `useStay`: a module cache with state as the source, abort, retry and `refresh`. It reads the public CDN, so no token.
- **Tab bar:** the design's yellow selected pill can't be drawn by `NativeTabs`. iOS 26 draws its own Liquid Glass selection, and the tint stays `ink`. This is a known difference, not worked around.
- **PostHog:**
  - `profile_row_opened { row: "personal_info" | "payments" | "trips" | "notifications" | "help" | "settings" }`
  - `profile_updated { name: boolean, location: boolean }`: which fields changed, never their values.
  - `roam_policies_opened { from: "profile" | "help" }`
  - `signed_out`, as today.

### Layout (pt, 402 wide frame)
- **ScrollView:** `bg-surface`, `contentInsetAdjustmentBehavior="automatic"`, `px-4 pt-2 pb-8`.
- **Header:** `flex-row items-center justify-between`.
  - Wordmark: new size `header` (`jumbo`, 52) with `ml-1`*. The design's "roam" is ≈120 pt wide versus Home's 134. The wordmark is still the placeholder text.
  - Gear: `IconButton icon="settings" variant="muted" size="bar"` (52*, icon 22), `accessibilityLabel="Settings"`.
- **Profile card:** `mt-3`* `flex-row items-center gap-3 rounded-xl bg-surface-muted p-2.5`* (≈128 tall).
  - Avatar: new size `xl` (`size-27`, 108*, initial in `headline`).
  - Text column `flex-1`:
    - `heading` name (2 lines max).
    - Location row (when set): `mt-0.5 flex-row items-center gap-1.5`, `pin` 18 tone `subtle`, then `body` tone `muted` (1 line).
    - Badge: `mt-1.5 self-start h-8.5 flex-row items-center gap-2 rounded-full bg-lavender-soft pr-4 pl-3.5`*, holding `star` 22 tone `primary` and `lead` "Roam Explorer".
- **Stats card:** `mt-2`* `flex-row items-center rounded-xl border border-border py-2.5`* (≈74 tall).
  - Three `flex-1 items-center` columns separated by `h-12 w-px bg-border`* dividers.
  - Each column: the value in the new `stat` variant (24 bold*), then a `body` tone `muted` label: "Trips", "Saved", "Rating".
  - Rating's value is a `flex-row items-center gap-1.5` of `star` 22 `primary` + "New".
  - Each column is one accessible element ("0 trips", "3 saved", "Rating: new").
- **Settings group** (Account, Preferences): `mt-3`* `rounded-xl bg-surface-muted px-1 pb-1.5`*.
  - Title: `title` with `px-3.5 pt-3 pb-1`*.
  - Inner card: `rounded-lg bg-surface`*.
  - Rows: each a `PressableScale` row `h-13 flex-row items-center gap-4 px-3.5`* (52), containing:
    - Tile: `size-9.5 rounded-lg corner-squircle bg-surface-muted`* (38) with the icon at 22.
    - `body` label, `flex-1`.
    - `chevronRight` 18 tone `ink`.
  - Between rows: `h-px bg-border ml-15 mr-3.5`*. The divider starts ≈7 pt after the tile, as in the design, not at the label.
  - Account rows: Personal info (`person`), Payment methods (`card`), Trips (`suitcase`).
  - Preferences rows: Notifications (`bell`), Help & support (`help`). Preferences sits `mt-3.5`* after Account.
  - Rows use full-row press highlighting: `PressableScale` with `transitionProperty={["opacity"]}` and the scale kept. Each row's label is its accessible name, with role button.
- **Policy card:** `mt-2.5`*, `PolicyCard icon="policy"`. `PolicyCard`'s untiled icon column loses its fixed height, so a one-line card is ≈68 pt, matching the design's ≈65. Two-line cards (like the stay's cancellation card) look the same as today.
- **Sign out:** `mt-6`.

### Proposed new tokens and registry entries
- `--text-stat: 24px`*, `--text-stat--line-height: 1.25` (30), `--text-stat--letter-spacing: -0.5px`*, plus `Text` variant `stat` (`font-jakarta-bold`). There's no 24 px step: `title` is 20 and `heading` is 28.
- `Avatar` size `xl`: `size-27`, initial in `headline`.
- `Wordmark` size `header`: `jumbo`.
- Icons:
  - `card`: `creditcard` / `credit_card`
  - `suitcase`: `suitcase` / `luggage`
  - `bell`: `bell` / `notifications`
  - `help`: `questionmark.circle` / `help`
  - Existing `settings` (`gearshape`) and `pin` (`mappin.and.ellipse`) cover the gear and location. All names are checked against `sf-symbols-typescript` and the `expo-symbols` Material list.
- No new colors. The design's card gray (≈#f6f7fa) maps to `surface-muted`, its badge lavender (≈#edebfe) to `lavender-soft`, and its divider gray (≈#e4e4ea) to `border`.

### Motion
| What | Purpose | Implementation |
| --- | --- | --- |
| Rows, gear, policy card | feedback | `PressableScale` (0.97, 120 ms) |
| Personal info, Coming soon | spatial | native stack push |
| Roam policies | spatial | native form sheet |
| Save success | feedback | one `notificationAsync(Success)` haptic with `router.back()` |

No other animation: Profile is a frequently visited tab.

## Out of scope
- Bookings, trip counts and guest ratings.
- Persisted favorites (Saved resets on restart, as today).
- Real payment methods, notification settings and support contact.
- Changing email or password, and uploading a profile photo.
- Restyling the native tab bar.
- Sanity schema changes.

## Steps
### 1. Tokens and primitives
Add the `stat` token and variant, `Avatar` `xl`, `Wordmark` `header`, and the four icons. Make `PolicyCard`'s untiled icon column auto-height. Add `useFavoriteCount()`. Show `stat`, `Avatar xl` and a settings group on `/design-system`. Lint and tsc pass.

### 2. Roam policies data and sheet
Add `ROAM_POLICIES_QUERY`, `useRoamPolicies`, and `src/app/policies.tsx`, registered in the root Stack (signed-in guard) as a form sheet. Run the query through the Sanity MCP and check that all 8 policies come back with slugs.

### 3. Profile components and screen
Add `src/components/profile/`: `profile-card.tsx`, `stats-card.tsx` and `settings-group.tsx` (`SettingsGroup` + `SettingsRow`). Add `src/lib/profile.ts` with `displayName(user)` and `guestLocation(user)`. Rebuild `src/app/(app)/profile.tsx` per the layout, including the policy card and Sign out.

### 4. Account screens
Add `src/app/account/personal-info.tsx` and `src/app/account/[topic].tsx`, and register them in the root Stack. Check `user.update` and `user.updateMetadata` against `node_modules/@clerk/shared/dist/types/user.d.ts`.

### 5. Compare with the design
Open `exp://127.0.0.1:8081/--/profile`, screenshot, and compare the header, card, badge, stats, both groups (tile, row height, divider inset), the policy card and the spacing between blocks. List every difference, fix it, and repeat. Also screenshot:
- Personal info, then save a location with the test user and check that Profile shows it.
- The three Coming soon screens.
- The Roam policies sheet, from the card (scrolled to guest refund) and from Help.
- Below the fold (Sign out).

## Verification
- `npx expo lint`, app `npx tsc --noEmit` (the untracked `agent/` folder excluded from the count) and `npx expo-doctor` pass.
- Drift greps: no hex, `fontSize`/`fontFamily` literals or arbitrary `[..]` classes outside `src/global.css`.
- Clerk:
  - Name and photo match the signed-in user.
  - Saving a new first name and a location in Personal info updates Profile without restarting. After an app restart the values persist (read back from Clerk).
  - Clearing the location removes it (`unsafeMetadata.location` gone, line hidden).
  - With the network off, Save shows the inline error and keeps the draft.
- Saved count: heart a stay on Search, go to Profile, and the count is 1 more.
- Policy text: the card's title and summary and the sheet's guest refund body equal the Sanity values character for character (one-off script, as in plan 09).
- Sign out returns to onboarding.
- Not judgeable here: Android, haptics, and taps that need a finger (driven with deep links and temporary code where possible). These are reported as ❌.

## AGENTS.md updates
- Design system:
  - Profile matches its design. The gear and Personal info open `/account/personal-info`, which edits `firstName`/`lastName` with `user.update` and `location` with `user.updateMetadata({ unsafeMetadata })` (never `update({ unsafeMetadata })`, deprecated in 4.8).
  - Payments, Notifications and Help are `/account/[topic]` Coming soon screens.
  - Sign out sits at the bottom of Profile.
  - Stats: Trips 0 and Rating "New" until the data exists; Saved is the session favorites count.
- Content: the Roam policies sheet `/policies` (`?section=<slug>`) lists all policies word for word (`useRoamPolicies`). Profile's card quotes the guest refund policy.
- Replace "Sign out lives in Profile" with the above.

## Result
Built as planned. Changes made while building, after comparing with the design side by side at 2 px/pt:
- **Type sizes were set by rendered width.** Sizes taken from cap height ran 7–11% wide, because the design's typeface has a taller cap ratio. Final sizes:
  - Group titles `cardTitle` (18).
  - Row labels, stat labels and the badge text `label` (15).
  - `stat` is 22/28.
  - Name `heading` 28 and location `body` 16 matched as planned ("Joanna Smith" 116 vs 114 pt, "San Francisco, CA" 91 vs 90 pt).
- **Spacing:** the stats card is `py-3`. The gaps are `mt-1.5` above the stats and `mt-2.5` before each group and the policy card. The badge is `h-8`. Tile icons are 24 and chevrons 16, closer to the design's weight. The location pin is 20.
- `useRoamPolicies` has no `refresh`: nothing pulls to refresh it.
- Remaining differences:
  - Clerk shows an initial when the guest has no photo.
  - Roam's guest refund summary runs to two lines, where the design's sample ran to one.
  - SF Symbols draw thinner strokes than the design's icons, and SF has no filled pin-with-ellipse.
  - The native tab bar has no yellow selected pill.

Lint, app tsc, expo-doctor 18/18 and the drift greps pass.

Simulator checks:
- Profile compared with the design, using real data and the design's sample name and location.
- Personal info, Payment methods, Help, and the Roam policies sheet opened at `guest-refund`.
- Clerk round trip: `user.update` + `user.updateMetadata` set "San Francisco, CA", which showed on Profile. Setting `null` removed it and hid the line.

Not exercised: typing in Personal info and tapping Save by hand, the offline save error, the Saved count after a heart, Sign out, Android, and haptics (no touch automation).

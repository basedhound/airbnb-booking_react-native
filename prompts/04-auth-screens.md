# 04 · Auth screens (mocked)

Status: done

## Goal
A guest can create an account, confirm their email with a 6-digit code, and sign in, on screens that match the sign-up design. Auth is mocked. It behaves like Clerk's flow, with loading, success and test error states, so Clerk can replace the mock later without changing the screens.

## Decisions
- Source: the sign-up design, attached in chat. Ask for it again when building in a new session. Sizes were read at about 1.58 px/pt (430 pt wide frame). At that scale the primary button measures 56 pt, which matches `Button md` h-14. Values marked * are estimates.
- There are no designs for verification and sign-in. Both are built from the sign-up design: same shell, same components, and copy written here.
- Mock auth lives in `src/lib/auth/mock.ts`, has the same shape as Clerk's flow, and waits about 800 ms per call:
  - `signUp({ name, email, password })`: throws "That email is already in use." for `taken@example.com`.
  - `verifyEmail({ email, code })`: accepts only `424242`, Clerk's test code. Any other code throws "That code isn't right. Check your email and try again."
  - `resendCode({ email })`: always succeeds.
  - `signIn({ email, password })`: throws "Email or password is incorrect." when the password is `wrong-password`.
  - `signInWithProvider("google" | "apple")`: always succeeds.
  - Errors are `AuthError` with a guest-facing `message`. Nothing is stored and there is no session yet.
- Client-side validation runs on submit, before the mock is called: name required, email matches a simple `x@y.z` pattern, password at least 8 characters, code exactly 6 digits. The first error shows in a danger `Alert` above the primary button, and the invalid fields get a danger border. Editing a field clears its error. The primary button stays enabled, as in the design.
- Navigation:
  - Sign up → `router.push({ pathname: "/verify", params: { email } })`.
  - Verify or sign in succeeds → the auth stack is cleared and the guest goes to `/home`, so Back can't return to the forms. Use `router.dismissAll()` then `router.replace("/home")`, or the v57 equivalent found in the docs.
  - The footer links between sign-in and sign-up use `replace`, as the stubs do now.
  - The back button calls `router.back()` and only shows when `router.canGoBack()`.
- `/home` is a stub at `src/app/home.tsx`: "You're signed in" (`heading`), a muted line "Auth is mocked until Clerk is set up.", and a secondary "Sign out" button that replaces to `/sign-in`.
- Social: Google and Apple run a mocked sign-in with a loading state, then go to `/home`. The Apple button shows on iOS only (`Platform.OS === "ios"`).
- Verify auto-submits when the 6th digit is entered and also has a "Verify" button. The resend link is disabled for 30 s, showing "Resend in 0:30" and counting down, and the count restarts after each resend. A successful resend shows a success `Alert` ("We sent a new code to …").
- Keyboard: each screen is a `ScrollView` with `keyboardShouldPersistTaps="handled"` and `automaticallyAdjustKeyboardInsets`. Fields chain with `returnKeyType="next"`, and the last field submits. Autofill: `name`/`email`/`new-password` (sign-up), `email`/`current-password` (sign-in), `one-time-code` (verify).
- Field: `TextField` gets an optional `label` prop (two-line field, design's layout) and an `invalid` prop. Both auth screens use it, so it belongs in `ui`. The single-line layout is unchanged when `label` is absent.
- Back button: `IconButton` gets an `outline` variant (`border border-border bg-surface`) and a `nav` size (`size-12`, icon 22).
- Auth-only pieces live in `src/components/auth/`: `AuthScreen` (shell), `SocialButtons`, `OrDivider`, `CodeInput`, `AuthFooter`. The `auth-stub.tsx` file is deleted.
- Placeholders (marked `// PLACEHOLDER` and listed in the report): the Google "G" reuses `GoogleMark`. The Apple logo is the SF Symbol `apple.logo`, registered as `apple`, which is allowed by Apple's guidelines. The wordmark stays the text placeholder at a smaller size.
- No PostHog events (PostHog isn't set up yet).

### Shared shell (`AuthScreen`), pt
- `bg-surface`, `StatusBar style="dark"`. Content `px-6`. The footer sits at the bottom (`flexGrow: 1`, `justify-between`). On short screens it scrolls.
- Header row: top = safe-area top + 8*, `flex-row justify-between items-center`, pulled out to 20 pt from the edges (`-mx-1`)*. Left: `IconButton variant="outline" size="nav" icon="arrowLeft"`. Right: `Wordmark size="md"` (new prop: `md` uses the `heading` variant, 28*, and `lg` stays `display`).
- Headline: `mt-8`*, `Text variant="hero"` (44/42, -1.5 tracking, measured ~42/40 in the design), ink, two lines with an explicit `\n`.
- Body: `mt-3`*, `body` (16/24), tone `muted`, three lines.
- Form: `mt-6`*, fields `gap-3.5`* (14).
- Primary button: `mt-6`*, `Button` primary md with `trailingIcon="arrowRight"`.
- `OrDivider`: `mt-5`*, row `items-center gap-5`*, 1 pt `bg-border` lines `flex-1`, "or" `caption` tone `subtle`.
- `SocialButtons`: `mt-3`*, `gap-4`*. Each is h-12*, `rounded-full border border-border bg-surface`, `flex-row items-center pl-18`*. The mark sits in a `w-9` box and the title (`buttonSecondary`, ink) starts at `gap-7`*. The design left-aligns both titles at the same x instead of centering them, so this is not `Button`.
- `AuthFooter`: `mt-10`*, bottom = safe-area bottom + 16*, centered row `gap-2`: prompt `label` tone `muted` and a link `Text variant="link"` (new: `font-jakarta-semibold text-label underline`), ink.

### Labelled field (`TextField` with `label`)
- h-16* (design ~66), `rounded-lg corner-squircle`, `px-5`, `gap-7`* between the icon (24, ink) and the text column. The default, focus (lavender) and border colors are unchanged. `invalid` gives `border-danger bg-danger-soft`.
- Text column: `label` (15 medium, ink), then the input (`font-jakarta text-body`, placeholder `ink-subtle`) with `py-0` and a fixed line height so the two lines stack tightly, centered vertically.
- The password toggle stays as it is (`eyeOff` while masked, `eye` when shown).

### Screens and copy
- Sign up (design): "Create\nyour account" / "Join roam to save your stays, get personalized recommendations and access them across all your devices." Fields: `person` "Full name" (placeholder "e.g. Adrian Hajdin"), `mail` "Email address" ("you@example.com"), `lock` "Password" ("At least 8 characters", secure). Button "Create account". Social. Footer "Already have an account?" / "Sign in".
- Verify: "Check your\nemail" / "We sent a 6-digit code to {email}. Enter it below to finish creating your account." `CodeInput`: 6 cells in a row with `gap-2.5`*, each `flex-1` h-16, `rounded-lg corner-squircle border-2`, digit in `title`. The cells use the field's colors, and the active cell (or every cell when invalid) gets the focus or danger colors. Underneath is one transparent `TextInput` (`keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `maxLength={6}`) that covers the cells, so paste and autofill work. Button "Verify". No social. Footer "Didn't get a code?" / "Resend" (or "Resend in 0:SS" in `muted`, not underlined, while counting down).
- Sign in: "Welcome\nback" / "Sign in to see your saved stays and pick up where you left off." Fields: email and password ("Your password"). Button "Sign in". Social. Footer "New to roam?" / "Create an account".

### Proposed token and icon changes
- No new color, size, or radius tokens. Every value maps to existing tokens.
- `Text` variant `link`. `IconButton` variant `outline` and size `nav`. `Wordmark` `size` prop.
- Icons: `mail` (SF `envelope`, Material `mail`), `apple` (SF `apple.logo`, Material `phone_iphone` as a placeholder, since the button is iOS-only). `person`, `lock`, `eye`, `eyeOff`, `arrowLeft` and `arrowRight` already exist.

## Out of scope
- Clerk, real sessions, persisting sign-in, and session-based routing in `index.tsx`.
- Forgot password, the sign-in second factor, and "terms" copy.
- Real Google and Apple logo assets.
- Dedicated designs for verification and sign-in (re-match when designs arrive).
- PostHog events.

## Steps
### 1. Primitives and tokens
Read `src/components/ui/*` and `src/global.css`. Add `link` to `textVariants`. Add the `mail` and `apple` icons. Add the `outline` variant and `nav` size to `IconButton`. Add `label` and `invalid` to `TextField` per the layout above. Add a `size` prop to `Wordmark`. Show the new pieces in `/design-system`. Lint and tsc pass.

### 2. Mock auth
Add `src/lib/auth/mock.ts` with the functions, test values and `AuthError` from Decisions, plus `src/lib/auth/validate.ts` (pure functions that return a field→message map). No React in these files.

### 3. Auth components
Read the v57 docs for expo-router (navigation, `router.dismissAll`/`replace`, typed params) and expo-status-bar first. In `src/components/auth/`, build `AuthScreen` (header, headline, body, children, footer slot), `OrDivider`, `SocialButtons` (owns its loading state and calls `signInWithProvider`, then `onSuccess`), `AuthFooter`, and `CodeInput`. Delete `auth-stub.tsx`.

### 4. Screens and routes
Rebuild `src/app/(auth)/sign-up.tsx` and `sign-in.tsx`, and add `src/app/(auth)/verify.tsx` (reads `email` with `useLocalSearchParams`, and goes back to sign-up if it's missing) and `src/app/home.tsx`. Each form keeps field state, errors, a `submitting` flag (passed as `Button loading`, with inputs `editable={false}` while submitting), and a top-level error string. Wire the navigation from Decisions.

### 5. Compare with the design
Open `airbnbrecord://sign-up` in the iOS simulator, take a screenshot, and compare it with the design: header, wordmark size, headline, body wrap, field height, icon and label positions, button, divider, social button alignment, and footer position. List the differences, fix them, and repeat. Then screenshot verify and sign-in and check that they read as the same system. Check that sign-up fits without scrolling on the iPhone 17 Pro, or note it.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, and `npx expo-doctor` pass.
- Drift greps: no hex values, `fontSize`/`fontFamily` literals, or arbitrary `[..]` classes outside `src/global.css`.
- Simulator flows:
  1. Onboarding "Get started" → sign-up. An empty submit shows "Enter your full name." with a red name field. A bad email or a 7-character password shows its own error.
  2. Sign up with `taken@example.com` → loading, then "That email is already in use."
  3. Sign up with a valid new email → verify screen showing that email. `111111` auto-submits and shows the code error with red cells. `424242` → `/home`, and Back doesn't return to the forms.
  4. Resend → success alert and a 0:30 countdown.
  5. Home "Sign out" → sign-in. `wrong-password` → error. A valid password → home.
  6. Google → loading → home. Apple → shows on iOS only, then home.
  7. The footer links switch between sign-in and sign-up. The back button returns to onboarding.
- The keyboard never hides the focused field or the primary button (sign-up, iPhone SE width).

## AGENTS.md updates
- Who owns what → Auth: replace "stubs until Clerk is set up" with: auth screens (`sign-up`, `verify`, `sign-in`) are built and call the mock in `src/lib/auth/mock.ts`. Clerk replaces the mock's functions, not the screens. `/home` is a stub landing screen.
- Design system: labelled fields use `TextField label`, and auth layout pieces live in `src/components/auth/`.

## Result
Built as planned. Changes made while building:
- Headline: the design measured about 40/40, not `hero`'s 44/42, so a new `headline` token and variant (40px, line height 1, -1.5px tracking) was added and the auth screens use it.
- Body: wrapped at `max-w-70` (280 pt), which matches the design's line breaks.
- Header: only the back button is pulled out (`-ml-1`). The wordmark sits on the 24 pt margin.
- Extra files: `form-error.tsx` (the danger `Alert` above the button) and `use-enter-app.ts` (`dismissAll` + `replace("/home")`).
- Expo Go uses `exp://127.0.0.1:<port>/--/<route>` deep links. `airbnbrecord://` only works on a development build.
- The sign-up screen is about 40 pt taller than the iPhone 17 Pro (402×874; the design frame is 430×932), so its footer scrolls into view.
Lint, tsc, expo-doctor (18/18) and the drift greps pass. The mock and validation logic was run in Node. Screenshots of sign-up, verify and sign-in were taken on the iPhone 17 Pro. Taps, typing and keyboard behavior were not exercised, since no tap automation is installed.

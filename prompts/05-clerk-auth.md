# 05 · Clerk auth

Status: done

## Goal
Real accounts in place of the mock. A guest can sign up with name, email and password, then confirm the email with a 6-digit code. They can sign in with email and password, entering a code when Clerk asks to verify a new device. They can also continue with Google or Apple. The session survives app restarts, `/home` is only reachable while signed in, and Sign out returns to onboarding. The existing custom screens and design stay the same.

## Decisions
- **Clerk MCP** was added at project scope (`.mcp.json`: `clerk` → `https://mcp.clerk.com/mcp`, HTTP). It's usable after a new Claude Code session approves it.
- **SDK:** `@clerk/expo` 4.8.1 is already installed and `ClerkProvider` + `tokenCache` is already in the root layout. The Clerk skill targets 3.6, so APIs were checked against the installed `.d.ts`. Use the method-based custom-flow API: `useSignIn()` / `useSignUp()` → `{ signIn | signUp, errors, fetchStatus }`, where every method resolves to `{ error }`. Never use `@clerk/expo/legacy` (`prepareFirstFactor`, `attemptFirstFactor`).
- **Instance config** (read from `<fapi>/v1/environment`): email required and verified with `email_code`, password required, first and last name optional, Google and Apple enabled, captcha on, MFA not required. Password min length is **15**. The user chose 8, so they will lower it in the Dashboard (see You need to). The app's 8-character check and placeholder stay as they are.
- **New dependencies** (via `npx expo install`):
  - `expo-secure-store`: required by `tokenCache`, without it sessions don't persist.
  - `expo-auth-session`: required by `useSSO`. `expo-web-browser` is already installed.
  - Add the `expo-secure-store` and `@clerk/expo` config plugins to `app.json`. They only matter for a dev build, and the app stays on Expo Go.
- **Sign up:** split "Full name" on the first whitespace into `firstName` and `lastName` (`lastName` omitted if there's one word). Call `signUp.password({ emailAddress, password, firstName, lastName })`, then `signUp.verifications.sendEmailCode()`, then `router.push({ pathname: "/verify", params: { email, flow: "sign-up" } })`.
- **Sign in:** `signIn.password({ emailAddress, password })`, then branch on `signIn.status`:
  - `complete` → `signIn.finalize()`.
  - `needs_client_trust` with an `email_code` second factor → `signIn.mfa.sendEmailCode()`, then push `/verify` with `flow: "sign-in"`.
  - Anything else (such as `needs_second_factor`, which no user can have yet) → generic error.
- **Verify** serves both flows through the `flow` param (default `sign-up`):
  - `sign-up`: verify with `signUp.verifications.verifyEmailCode({ code })`, resend with `signUp.verifications.sendEmailCode()`. Valid only while `signUp.status === "missing_requirements"` and `unverifiedFields` includes `email_address`.
  - `sign-in`: verify with `signIn.mfa.verifyEmailCode({ code })`, resend with `signIn.mfa.sendEmailCode()`. Valid only while `signIn.status === "needs_client_trust"`.
  - When the attempt isn't valid (for example a deep link or an app restart), `<Redirect>` to `/sign-up` or `/sign-in`.
  - On `complete`, call `finalize()`.
  - Body copy: sign-up keeps "…to finish creating your account." Sign-in uses "We sent a 6-digit code to {email}. Enter it below to confirm it's you."
  - Auto-submit, the 30 s resend countdown and the success alert are unchanged.
- **Social:** browser SSO with the stable `useSSO()` from `@clerk/expo` (not `@clerk/expo/experimental`). Use `startSSOFlow({ strategy: "oauth_google" | "oauth_apple" })`, then `setActive({ session: createdSessionId })`.
  - No `createdSessionId` and no `signUp.status === "missing_requirements"` means the guest cancelled. Show no error.
  - `missing_requirements` shows "We couldn't finish setting up your account. Try signing up with email."
  - Apple stays iOS-only, and the buttons and their loading states are unchanged.
  - Default redirect URL (`sso-callback` on the `airbnbrecord` scheme). Never call `WebBrowser.maybeCompleteAuthSession()`, because `ClerkProvider` does it.
- **Captcha:** Sign up and Sign in each render `<View nativeID="clerk-captcha" />`, because Sign in can create a sign-up through SSO. It goes after the social buttons and takes no space.
- **Errors:** `src/lib/auth/errors.ts` replaces `mock.ts` and maps a Clerk error to guest copy by `code`. Anything else falls back to the error's `longMessage`, then "Something went wrong. Please try again."

  | Code | Message |
  | --- | --- |
  | `form_identifier_exists` | That email is already in use. |
  | `form_identifier_not_found`, `form_password_incorrect` | Email or password is incorrect. (Doesn't reveal whether an account exists.) |
  | `form_code_incorrect` | That code isn't right. Check your email and try again. |
  | `verification_expired` | That code has expired. Tap Resend to get a new one. |
  | `form_password_pwned` | This password has appeared in a data breach. Choose a different one. |
  | `form_password_length_too_short` | Use at least 8 characters for your password. |
  | `too_many_requests` | Too many attempts. Wait a moment and try again. |

  Screens keep their current error UI (one danger `Alert` above the button). They read the `{ error }` that each method returns, and use `fetchStatus` only through their existing `submitting` state.
- **Routing and protection:** use Expo Router `Stack.Protected` in the root layout.
  - Guard `!isSignedIn`: `onboarding` and `(auth)`.
  - Guard `isSignedIn`: `(app)`.
  - Unguarded: `index` (anchor) and `design-system`.
  - `home.tsx` moves to `src/app/(app)/home.tsx` (the URL stays `/home`) with a plain Stack `_layout.tsx`.
  - `index.tsx` redirects to `/home` when signed in and to `/onboarding` otherwise.
  - When the session starts or ends, the guard drops the old screens and their history, and the anchor redirects. So screens don't navigate on success: `finalize()` and `setActive()` are enough, and `useEnterApp` is deleted. If `session.currentTask` is set, there's nothing to handle yet (no tasks are enabled), so it's logged.
- **Loading:** the splash stays up until fonts are loaded and Clerk's `useAuth().isLoaded` is true, so signed-in guests never see onboarding flash. This means a `RootNavigator` child inside `ClerkProvider`.
- **Home stub** (`/home`): "You're signed in" (`heading`). The muted line becomes the account's primary email. "Sign out" (secondary, with a loading state) calls `signOut()`, and the guard then lands the guest on `/onboarding`.
- **Env:** create `.env.example` with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`. The secret key stays unused by the app and is never `EXPO_PUBLIC_`.
- No PostHog events (PostHog isn't set up yet).

## Out of scope
- Native Apple and Google sheets (needs a dev build and provider console setup).
- Forgot password, MFA enrollment, session tasks UI, profile and account management.
- Calling API routes with the session token (no API routes exist yet).
- Designs for Verify and Home (unchanged stubs).

## Steps
### 1. Dependencies, config, env
Run `npx expo install expo-secure-store expo-auth-session`. Add the `"expo-secure-store"` and `"@clerk/expo"` plugins to `app.json` if install didn't. Create `.env.example`. Done when `npx expo-doctor` and `npx tsc --noEmit` pass.

### 2. Errors module
Create `src/lib/auth/errors.ts` with `authErrorMessage(error: unknown): string`, using the mapping above. Read `error.errors?.[0]?.code` and `longMessage` defensively, because the type is `ClerkError` from `@clerk/shared`, so check its shape there. Keep `validate.ts` as is.

### 3. Root navigation and protection
In `src/app/_layout.tsx`:
- Keep the fonts and the publishable-key check.
- Render `<ClerkProvider><RootNavigator fontsReady /></ClerkProvider>`.
- `RootNavigator` hides the splash and renders when fonts are ready and `isLoaded` is true. It returns `null` before that.
- The Stack uses the `Stack.Protected` groups above.

Move `home.tsx` to `src/app/(app)/home.tsx` and add `(app)/_layout.tsx`. Update `index.tsx`. Done when a signed-out cold start shows onboarding, and deep linking `/home` lands on onboarding.

### 4. Sign up and Verify
Wire `sign-up.tsx` and `verify.tsx` to `useSignUp()`, and Verify's `sign-in` branch to `useSignIn()`, as in Decisions. Add the captcha view. Remove `useEnterApp` usage. Done when the real flow creates a user and lands on `/home`.

### 5. Sign in
Wire `sign-in.tsx` to `useSignIn()`, including the `needs_client_trust` branch to Verify.

### 6. Social buttons
Replace the mock in `social-buttons.tsx` with `useSSO`. The props drop `onSuccess`, because the guard navigates, and keep `onError` and `onBusyChange`.

### 7. Home and sign out, cleanup
Update the home stub. Delete `src/lib/auth/mock.ts` and `src/components/auth/use-enter-app.ts`. Grep to confirm nothing imports them.

## Verification
- `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` pass.
- Clerk instance check via the Frontend API with a `+clerk_test` email and code `424242` (dev-instance test values): sign-up → verify → session created. This confirms the flow and instance config without the UI.
- Simulator screenshots via deep links:
  - signed-out cold start → onboarding.
  - `/home` while signed out → onboarding.
  - `/sign-up`, `/sign-in` and `/verify` look the same as before (no social or captcha layout shift).
- Manual flows for the user to run (listed in Test it yourself):
  - Sign up with `you+clerk_test@example.com`, code `424242` → home showing the email.
  - Kill and relaunch the app → still on home.
  - Sign out → onboarding. Back can't reach home.
  - Sign in with the wrong password → "Email or password is incorrect."
  - Sign up again with the same email → "That email is already in use."
  - Wrong code → error. Resend → success alert.
  - Google, and Apple on iOS, → home. Cancelling the sheet → no error.
  - Signed in, open `/sign-in` → redirected to home.

## AGENTS.md updates
- **Who owns what → Auth:** replace the mock sentence. Custom flows use `@clerk/expo`'s method-based `useSignIn`/`useSignUp` (never `@clerk/expo/legacy`). Email + password, with an email code for sign-up verification and new-device trust on sign-in. Google and Apple use browser SSO via `useSSO`. Sessions persist through `tokenCache` (`expo-secure-store`). Test with `+clerk_test` emails and code `424242`.
- **Design system →** `index.tsx` line: route protection is `Stack.Protected` in the root layout, with `(app)` signed-in only and `onboarding`/`(auth)` signed-out only. Screens don't navigate after auth because the guard does. Replace "once Clerk lands…".
- **Design system →** remove "`useEnterApp`" if mentioned. Note Sign up and Sign in render `clerk-captcha`.
- **Rules:** Clerk's password minimum is 8 in the Dashboard, matching `validate.ts`. Change both together.

## Result
Built as planned. Clerk MCP added in `.mcp.json`. Lint, type check and expo-doctor (18/18) pass. A Frontend API run against the dev instance confirmed every branch the screens rely on: sign-up → `missing_requirements` → code `424242` → `complete`, plus `form_code_incorrect`, `form_identifier_exists`, `form_password_incorrect`, and `needs_client_trust` with `email_code` on a new client. 8-character passwords return `form_password_length_too_short` until the Dashboard minimum is lowered. Simulator: signed-out cold start and `/home` land on onboarding, the auth screens are visually unchanged, and `/verify` without an attempt redirects to Sign up. Signed-in UI flows (sign up, restart, sign out, SSO) were not driven in the simulator and are left for manual testing. Gotcha: a dev server started before the Clerk packages were installed fails with "Unable to resolve @clerk/react/internal". Restart it with `npx expo start --clear`.

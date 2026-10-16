# Roam

Expo React Native rental app. Guests describe a stay in one sentence ("quiet pet friendly cabin with a hot tub under $300 a night") and get ranked stays back. They can also ask booking and policy questions about a stay, answered with exact text from Roam's own content.

This file is the project's memory: it holds every decision that is still true. Plans in `prompts/` are history.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm install: resolves SDK-compatible versions
npx expo start              # dev server (press i for the iOS simulator)
npx expo lint               # lint
npx tsc --noEmit            # type check
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npx eas-cli@latest <cmd>    # EAS builds, submits, and updates (use instead of bare `eas`)
```

## Expo

- Expo ships breaking changes every SDK release, so don't trust memory. Before touching an Expo, EAS, or React Native API, check the `expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`. For anything else, start from https://docs.expo.dev/llms.txt and follow its links.
- Routes live in `src/app/`: every file is a screen and `_layout.tsx` files define navigators. API routes are `src/app/api/*+api.ts`. Keep components, hooks, and utils outside `src/app/`.
- `ios/` and `android/` are generated. Never create or edit them by hand; configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, switch to a development build (`npx expo run:ios`).
- Styling is NativeWind v5 (`className`) on Tailwind v4, configured CSS-first in `src/global.css` (imported once in `src/app/_layout.tsx`). Docs: https://www.nativewind.dev/v5/llms-full.txt. Keep `nativewind` and `react-native-css` pinned as a matching RC pair, and `tailwindcss`, `@tailwindcss/postcss`, and `lightningcss` (plus its `overrides` entry) pinned exactly. Metro's `withNativewind` does the transform, so there is no `babel.config.js`. Use `useColorScheme` from `react-native`, not `nativewind`.

## Who owns what

Each tool has one job. Ask before moving a responsibility to a different tool.

- **Auth:** Clerk is the source of truth, behind the app's own screens in the `(auth)` group (`sign-up`, `verify`, `sign-in`). Custom flows use `@clerk/expo`'s method-based `useSignIn`/`useSignUp` (methods return `{ error }`); never `@clerk/expo/legacy`. Email + password, with an email code for sign-up verification and for new-device trust on sign-in (`needs_client_trust`; `/verify?flow=sign-in`). Google and Apple use browser SSO via `useSSO` from `@clerk/expo`. Sessions persist through `tokenCache` (`expo-secure-store`). Error copy lives in `src/lib/auth/errors.ts`. Test with `name+clerk_test@example.com` and code `424242`. Use the Clerk MCP (`.mcp.json`) and Clerk CLI for current patterns.
- **Content:** Sanity project `0z83ssmn`, dataset `production` (public read). Types: `property` (stay), `host`, `policy` and `review`, defined in `studio/schemaTypes/`. Everything guests filter on is a typed field, and descriptive text (`facts`, `vibes`, `summary`, `description`, `highlights`) lives on the property. Hosts and policies are shared documents; stays reference one host and one cancellation policy. Home reads published content from the public API CDN with a plain `fetch` and no token (`src/lib/sanity/`). Search posts the sentence to `POST /api/search` (`src/app/api/search+api.ts`): Jev reads it (`src/lib/server/jev.ts`), code builds GROQ (`src/lib/server/search-groq.ts`) and runs it through the `roam-record-search` Context endpoint (`src/lib/server/context.ts`, one JSON-RPC `groq_query` call). The response carries the `SearchIntent` (`src/lib/search/intent.ts`); chips and sort send it back as `{ intent }`, so Jev reads each sentence once. Places are matched in code (`findPlace` in `parse.ts`); the regex parser is the fallback when Jev fails. Stay details read one stay by slug (`STAY_QUERY`, `src/hooks/use-stay.ts`), including its host, its cancellation policy and Roam's other policies. Studio is a standalone app in `studio/`, deployed at roam-record.sanity.studio.
- **Schema and seed:** schema changes deploy with the Studio CLI from `studio/` (`npx sanity schema deploy`, then `npx sanity deploy`), because the MCP's `deploy_schema` refuses local Studios. The Sanity MCP handles embeddings, queries and checks. Seed data lives in `studio/seed/`. `npx sanity exec scripts/seed.ts --with-user-token` (from `studio/`, flags after `--`: `--dry-run`, `--skip-copy`, `--only-copy`, `--slug`, `--force`) is safe to rerun. It never deletes and finds documents by `slug.current` (or `seedKey` for reviews), never by `_id`.
- **Generated copy:** Agent Actions Generate writes `summary`, `description` and `highlights` (`noWrite`, `operation: 'set'`) from a source text built only from the stay's typed fields, `facts` and `vibes`. Code checks (`studio/scripts/copy-checks.ts`) and a Prompt that lists unsupported claims must both pass before the script stores it. Failed copy is never stored. `copyReview.sourceHash` skips stays whose source hasn't changed.
- **Exact constraints** (max/min price, guests, bedrooms, type, amenities, pets, place; required or avoided): GROQ filters. CDN reads pass values as params. Context's `groq_query` takes no params, so Search writes literals only through `lit()`: code enums, finite numbers, known place values (`placeValueSet`), and the JSON-encoded sentence (≤ 300 chars). Client intents are re-validated (zod, `search-request.ts`) before any literal is built. Place matches any of city, region, country or neighborhood, lowercased; US state names map to their codes.
- **Soft intent** (quiet, cozy, secluded): Dataset Embeddings via `text::semanticSimilarity()` over the guest's sentence inside `score()`, plus `boost()`s weighted by Jev's probabilities (vibes ×3, preferred amenities/types/pets ×2). Negative boosts score 0, so avoided vibes are an `order()` term. Enabled on `production` with a property-only projection: `{ _type == 'property' => { title, type, city, region, country, neighborhood, summary, description, highlights, vibes, facts, amenities } }`. Queries using it count against quota, so they run from API routes, not the app.
- **Search Context endpoint:** `roam-record-search` (GROQ mode, project `0z83ssmn`, URL in `SANITY_CONTEXT_MCP_URL`). `roam-search` points at a different project; don't use it.
- **Policy knowledge:** Ask reads the `roam-record-guest-policies` Context endpoint (Knowledge Base mode, KB `kbcnL3rGhI30`, built from the 8 `policy` documents; URL in `SANITY_CONTEXT_KB_URL`) through `callContextTool` (`initial_context`, then one `knowledge_base_read` per path). `roam-policies` is built from another project (`z8iwmzg9`); don't use it. Context endpoints are created in the Dashboard's Context app and read with an organization token (Context Viewer), per https://www.sanity.io/docs/ai/context-migration-guide. One endpoint serves one mode. The Context skill still describes `sanity.agentContext` Studio documents with a project token; that route is deprecated, so don't use it. KB entries are written by Sanity's build, not Roam: `src/lib/server/policy-kb.ts` keeps a 10-minute snapshot in which Jev has checked every block against the full text of its source policies, and only sections whose blocks all pass are ever shown (tables never). Fix KB wording in the Context app, not in code.
- **Typed decisions** (search filters and numbers; which stay topics and policies answer a question): Jev, called from API routes through the AI SDK's `experimental_decide` (`experimental_evaluate` is a deprecated alias) with `typeSafeAi.decisionModel("jev-latest")` and `TYPESAFE_AI_API_KEY`. No Vercel AI Gateway. Keep `ai` and `@ai-sdk/typesafe-ai` pinned to exact versions, since the API is experimental. Search asks one Choice per filter (wanted / implied / avoided / not_mentioned): it filters only at P(wanted) or P(avoided) ≥ 0.9, otherwise ranks with weight P(wanted) + ½·P(implied) when ≥ 0.3; vibes never filter. Each number code finds gets a role Choice (maxPrice, minPrice, guests, bedrooms, other), used at P ≥ 0.6 within code bounds. Ask checks KB blocks with a Choice (supports / partly / contradicts / says_nothing; a block passes at P(supports) ≥ 0.9) plus a source-attribution Choice (counts at ≥ 0.6), once per changed entry. Per question, one Noul per passage picks at P ≥ 0.6; code drops other cancellation tiers before asking, keeps one entry per source policy, and shows at most 3 KB cards.
- **Answer text:** none generated. Answers show the stay's own fields and policy text word for word, with their source. No LLM runs in the app. House rules are lines built in code from typed fields (`src/lib/stay-details.ts`). Policy bodies render through `PolicyBody` (no Portable Text dependency). Stay details list the key house rules (check-in through parties, not `additionalRules`) under "Good to know" (`src/components/stay/good-to-know.tsx`), with "Show all rules" when extra rules exist. The "Ask about this stay" card opens `/stay/[slug]/ask`. Typed questions and chips go to `POST /api/ask` (`{ slug, question }` → `{ cards, topics }`), where Jev picks checked KB sections, the stay's house-rule lines and its cancellation summary (`src/lib/server/policy-answers.ts`). Cards show them word for word with a source label; KB cards render through `PolicyBody`. While waiting, a Roam bubble reads "Checking Roam's policies…". If the route fails, the keyword matching in `src/lib/ask.ts` answers from the stay `useStay` loaded. With no match, the reply says so and points to support.
- **Analytics:** PostHog, identified through Clerk.

## Rules

- Secret keys (Clerk secret key, TypeSafe key, Sanity organization token, Sanity write token) never reach the app bundle. Use them only in API routes and local scripts such as seeding. Never put them behind `EXPO_PUBLIC_`, which is bundled into the app. Never commit `.env` or `.env.local` (both gitignored; local values live in `.env.local`). Keep variable names, without values, in `.env.example`.
- Sanity Context needs a deployed Studio for the dataset. Redeploy Studio from `studio/` after schema changes.
- Jev is not an agent. It answers typed questions (Choice, Noul, Score) with probabilities. It never writes GROQ, calls tools, or generates text. Code builds queries from its answers.
- Prices, guest counts, and dates are parsed in code. Jev may choose between candidates code found, but never produces the value.
- Embeddings rank, they don't filter, and they only see the document itself (no references). Hard constraints are always GROQ filters, and text that should affect ranking lives on the property document.
- Policy answers show only text from the stay's data, Roam's policies, or Knowledge Base sections that passed the check, word for word. Unchecked KB text is never shown. If nothing answers the question, say so and point to support.
- API routes verify the Clerk session before doing any work (`requireSession`, `@clerk/backend` `verifyToken`; the app sends `useAuth().getToken()` as a bearer token). Server modules live in `src/lib/server/` and are imported only by `+api.ts` files. API routes need `web.output: "server"` in `app.json` (SDK 57 has no `apiRoutes` flag); in dev, relative `fetch("/api/...")` hits the dev server. The dev server re-evaluates API route modules on every request, so server state that must persist (like the KB snapshot) lives on `globalThis`. Server logs never include what guests type.
- PostHog failures never block the app. Never send what guests type, tokens, or personal data in events.
- Let Sanity generate document IDs. Model relationships as references.
- Clerk's password minimum (Dashboard) and `validate.ts` are both 8 characters. Change them together.
- Ask before adding a dependency or service, changing the Sanity schema once content exists, or deleting data. Prefer Expo modules over third-party libraries.
- Whenever you need input from the user, ask through your tool's built-in question panel so they pick from options instead of typing. Give two to four clear options with the recommended one first. Fall back to plain text only if no such panel exists.

## How we build features

For a new feature or a change across several files. Small fixes and questions skip this.

1. **Understand.** Read the code involved. Open an earlier plan only if this feature builds directly on it (pick by file name). Read the current docs pages for the APIs you'll use, and load a matching skill if one exists (e.g. the Expo, Clerk, Sanity, Sanity Context, or TypeSafe skills). Don't write version-specific APIs from memory.
2. **Ask.** If a real decision is unclear (scope, visible behavior, data shape), ask in the question panel, batching questions into one round and following up only if the answers raise new ones. Pick defaults for the rest and list them. If a decision in this file looks wrong, raise it instead of changing it.
3. **Plan.** Copy `prompts/TEMPLATE.md` to `prompts/NN-feature-name.md` (next number) and fill it in. The plan must be self-contained, so a fresh session can build it from this file plus the plan alone.
4. **IMPORTANT: stop and wait.** Write no app code until the user approves the plan. Ask for approval in the question panel (approve, or request changes). If they request changes, update the plan and ask again. On approval, set `Status: approved`.
5. **Build** step by step, checking each one. If a step turns out wrong, stop and explain instead of redesigning.
6. **Close out.**
   - Run the plan's Verification and give the report described under Reporting.
   - Add a short `## Result` to the plan and set `Status: done`.
   - Update this file: put each lasting decision in the section it belongs to. Replace or remove rules that are no longer true instead of appending. Keep this file under 150 lines.

## Building from designs

Designs are attached in the chat. Screens must match them exactly: layout, spacing, sizes, colors, type, radii, icons, and copy.

- Icons, fonts, and brand images come from `assets/` or the chosen icon library, never recreated from a screenshot. Sample property photos may be remote placeholder images. If an asset is missing, use a marked placeholder and list it.
- Map every color, font, spacing value, and radius to a design-system token. List values with no token in the plan as proposed new tokens instead of hardcoding them. When creating the design system itself, derive the tokens from the designs.
- UI plans describe the design (elements, states, tokens, assets) well enough to build without the image. If building in a new session, ask for the design to be attached again.
- After building, open the screen in the iOS simulator (deep link with `xcrun simctl openurl booted <url>` when it isn't the first screen; the scheme is in `app.json`), take a screenshot (`xcrun simctl io booted screenshot <path>`), and compare it with the design. List every difference, fix, and repeat. Report which values were estimated from an image.

## Design system

- Tokens live only in `src/global.css` `@theme` (colors, 4px `--spacing`, fonts, `--text-*` ramp, radius, shadows); Tailwind's default palette, ramp, radii and shadows are cleared. JS-only values (motion) live in `src/theme/`. No hex, font size, or arbitrary `[..]` class outside `global.css`.
- `--text-*--line-height` must be a unitless ratio: NativeWind multiplies it by the font size, so `px` values break layout.
- Text goes through `<Text variant tone>` and icons through `<Icon name tone>` (expo-symbols, names registered in `src/components/ui/icons.ts`). Color is a `tone` prop, never a second `text-*` class, because conflicting classes resolve by CSS order.
- Font is Plus Jakarta Sans (static TTFs in `assets/fonts/`), loaded with `useFonts` in the root layout behind the splash screen. Switch to the `expo-font` config plugin once the app runs on a development build. Weight comes from the family (`font-jakarta-bold`), never from `font-bold`.
- Light mode only (`userInterfaceStyle: "light"`). Add dark values as `prefers-color-scheme` overrides of the same tokens.
- Labelled two-line fields use `TextField label`. Auth layout pieces (`AuthScreen`, `SocialButtons`, `CodeInput`) live in `src/components/auth/`.
- Primitives live in `src/components/ui/` and take `className` (layout only) and `style` (merged last). Promote other views there only once two screens use them. Native controls (Switch) stay native and get colors through `styled` mappings.
- Route protection is `Stack.Protected` in the root layout: `(app)` is signed-in only and is a `NativeTabs` group (Home, Search, Trips, Profile; tint from tokens via `styled` `nativeStyleMapping`; the design's yellow selected pill isn't drawable natively), `onboarding` and `(auth)` signed-out only. `index.tsx` is the anchor and redirects to `/home` or `/onboarding`. Screens never navigate after sign-in or sign-out; the guard does. The splash stays up until fonts and Clerk have loaded. Sign up and Sign in render `<View nativeID="clerk-captcha" />`. The design-system preview lives at `/design-system` (`?y=<offset>` opens it scrolled). In Expo Go, deep link with `exp://127.0.0.1:8081/--/<route>`.
- Motion follows the expo-animation skill: tab switches never animate; pressables use `PressableScale` (0.97, 120 ms); curves and durations come from `src/theme/motion.ts` (never ease-in); layout animation builders live at module scope with a `reduceMotion` setting. `expo-haptics` fires once per action, never as the only feedback.
- Single-line `TextInput`s take only `text-input` (no line height); any other `text-*` class wraps them on iOS.
- Stays open at `/stay/[slug]` from Home and Search cards. It's pushed over the tabs (so are its `ask` chat and `book`), and `policies` (`?section=<policy kind>` scrolls to it) is a form sheet with fixed detents (`fitToContents` leaves the sheet bottom see-through on iOS 26). The host shows inline ("Meet your host", `HostSection`). "Book this stay" opens `book`, a placeholder trip summary (stay, dates/guests "Coming soon", `priceLines`, cancellation) with "Confirm and pay" disabled until booking exists. Until dates exist, the total is `price × minNights + cleaningFee`.
- Data hooks key their state by request and never treat a module-cache read in render as the source of truth (the React Compiler memoizes it). Each exposes `refresh()`, `refreshing` and `refreshError`.
- Screen states: empty and error use `EmptyState` (ui); load errors go through `LoadError` (`src/components/load-error.tsx`), worded by cause (can't connect vs something went wrong). Loading uses pulsing `Skeleton` (CSS animation, static with Reduce Motion) shaped like the content; small cached screens use `Spinner`. Home, Search and stay details pull to refresh with `RefreshControl`; a failed refresh keeps the content and shows a dismissible danger `Alert`. Search shows "Finding stays…" on a first load and "Updating…" while newer results load over older ones.
- Profile matches its design (`src/components/profile/`). Name and photo come from Clerk; Trips shows 0 and Rating "New" until bookings and guest ratings exist; Saved is the session favorites count (`useFavoriteCount`). The gear and Personal info open `/account/personal-info`, which saves `firstName`/`lastName` with `user.update` and `location` with `user.updateMetadata({ unsafeMetadata })` (never `update({ unsafeMetadata })`, deprecated in `@clerk/expo` 4.8). Payments, Notifications and Help are `/account/[topic]` Coming soon screens. Sign out sits at the bottom of Profile. Profile's policy card quotes the guest refund policy and opens the `/policies` form sheet (`?section=<slug>`), which lists all of Roam's policies word for word (`useRoamPolicies`).
- Plus Jakarta Sans has no emoji glyphs (iOS draws "?"), so use an `Icon` instead of emoji in text.
- Search result titles use `cardTitle`. Dropdowns use `@expo/ui`: SwiftUI `Menu` (`*.ios.tsx`) and Compose `DropdownMenu`, with an `RNHostView` label. Favorites are in memory only (`src/lib/favorites.ts`) until persisted.
- Third-party views (`expo-image`, `GlassView`, `react-native-svg`) need `styled(X, { className: "style" })` before `className` works. SVG fills come from token classes through `nativeStyleMapping: { color: "fill" }`.

## Reporting

End every piece of work that changes code (features and fixes, not answers to questions) with this report. Use these headings in this order, and leave out any section that would be empty.

- **Done:** one line on the outcome, then the files changed and what changed in each.
- **Verified:** each check with ✅ or ❌ and its evidence (command output, screenshot). List what wasn't checked as ❌ with the reason. Never mark something ✅ without running it.
- **You need to:** numbered actions only the user can take, such as keys, dashboard settings, manual steps in Sanity, or assets to provide.
- **Test it yourself:** numbered steps to reproduce the result from a fresh start, ending with `Expected:` and what the user should see.
- **Notes:** defaults picked, trade-offs, and anything left for later.

## Checks

- Lint and type check pass before any task is called done.
- Screens that load data handle loading, error, and empty states.
- AI features are tried against realistic inputs, and failures are explained by cause: missing data, the decision Jev made, the query, or the code.

# 13 · Ask answers from the policy Knowledge Base

Status: done

## Goal
In "Ask about this stay", every question (typed or chip) goes to `POST /api/ask`. The route has Jev pick which passages answer it: sections of Roam's guest-policy Knowledge Base and this stay's own rules. The chat shows them as answer cards, word for word, each with its source. A KB section is shown only after Jev has checked it against the Roam policies it was built from. If nothing answers, the reply says so and points to support. If the route fails, the chat falls back to today's keyword answers.

## Decisions
- **Endpoint (your answer):** `roam-record-guest-policies`, the URL already in `SANITY_CONTEXT_KB_URL` (Knowledge Base mode, KB id `kbcnL3rGhI30`, 9 entries built from the 8 `policy` documents in project `0z83ssmn`). `roam-policies` serves KB `kbQZoTsIhFrv`, built from project `z8iwmzg9`'s policies ("Traveling with pets", "Refunds", "Guest safety"…), and contradicts Roam's text (check-in instructions "by email 24 hours before" vs "through Roam 48 hours before"), so it isn't used.
- **Calling the KB:** the same stateless JSON-RPC `tools/call` as search (`Authorization: Bearer $SANITY_ORGANIZATION_TOKEN`, `Accept: application/json, text/event-stream`). Tested on the endpoint: `initial_context` (no args) returns the outline as Markdown; `knowledge_base_read` (`{ knowledgeBase, paths }`) returns entries as Markdown in `result.content[0].text`. `knowledge_base_search` exists but isn't needed: the whole KB is small enough to judge every section per question.
- **Card text (your answer): KB text, checked by Jev.** Entries are written by Sanity's build, not by Roam, and today some are wrong (the cancellation summary table says Flexible's cleaning fee isn't refunded inside 24 hours; the policy says it is). So each KB snapshot is checked once, block by block, against the full text of its source policies, and a section is shown only if every block passes. Measured on the live KB (107 questions in 9 parallel requests, 0.7–1.8 s, `jev-1.13.0`): 22 of 36 sections pass. The ones that fail and why:
  - Unsupported claims: the intros of `cancellation_and_refunds` ("shown on the listing before you book"), `guest_conduct`, `house_rules` and `liability_and_disputes`; `liability_and_disputes` "Roam's role" (0.77–0.80); `payments_and_fees` "Price transparency" ("no charges appear after confirmation"); `pets` "Pet fee" ("the exact fee… is shown at booking in the stay's house rules").
  - Contradiction: `payments_and_fees` intro, "Payment is due in full at the time of booking" (the policy allows split pay), contradicts 0.71.
  - Partly supported: `payments_and_fees` "What the price includes" ("Pet fee — applied when relevant (see pet policy…)" 0.12); `pets` "Guest responsibilities" ("at all times", 0.82); `house_rules` "What house rules cover" and "How rules are communicated"; `cancellation_and_refunds` "Refunds for serious stay problems" (0.56–0.67).
  - Meta text: `safety` "Refunds" ("those topics fall outside this entry's scope", says_nothing 0.79).
  - Tables are never shown (the `cancellation_and_refunds` "Summary table", which holds the cleaning-fee error).
- **Card size (your answer): matching sections.** Code splits entries at `##` headings. Jev judges each section; a card is one entry showing only its picked sections, in entry order.
- **Stay cards (your answer):** in the same Jev request, every house-rule line (`houseRuleParts`, built from typed fields) and the stay's cancellation policy summary are passages too. The KB leaves stay details out by design ("Leave out: details of individual stays"), so these cards carry this stay's times, pet rules and tier. They come first.
- **Parsing an entry** (format observed on all 9): `# Title`, a one-line description (not shown), content, then `## Sources` as `N. <policy title> — Dataset`.
  - Content before the first `##` is the intro section (no heading).
  - Each paragraph is one block. Lines starting `- ` are bullet blocks. A paragraph whose first line is text and the rest bullets becomes one paragraph then bullets.
  - `**x**` becomes a `strong` span. Citation markers (`[1]`, `[1][2]`) are removed, because the card names its sources instead. Every other character is kept as written.
  - A section containing a table row (`|`) is excluded.
  - Blocks become `PolicyBlock`s (section heading as `h3`, `listItem: "bullet"`, `marks: ["strong"]`), so cards render through the existing `PolicyBody`.
  - Sources map to Sanity `policy` documents by exact title (all 8 match today). An entry with no matching source is excluded.
- **The check (once per KB snapshot):** one request per entry, run in parallel. State: `{ policies: [{ title, text }] }` holds the entry's sources, with `text` from `pt::text(body)`. Questions:
  - Per block, a Choice. `instructions: { task: "How do Roam's policies in \`policies\` relate to this passage from a guest help article built from them?", article, section, passage }`.
  - Its criteria: `supports` "The policies state everything the passage says, or directly imply it." / `partly` "The policies state some of what the passage says, but the passage also says something the policies do not." / `contradicts` "The policies say something different from the passage on a point the passage makes." / `says_nothing` "The policies do not address what the passage says."
  - A section is verified when no block is a table and every block has P(supports) ≥ 0.9.
  - Per section, when the entry has more than one source, a Choice "Which of Roam's policies in `policies` is this section of a guest help article taken from?" over the source titles plus `none`. The top option counts at P ≥ 0.6, unless it's `none`. A single-source entry is attributed to its source.
  - Attribution is reliable even where the KB's citation numbers are wrong. For example, the Flexible section matched Flexible at 1.00 while the KB cites it as [1] = Strict.
- **Picking passages (once per question):** one request. State: `{ question, stay: { title, cancellationPolicy: <title> } }`. One Noul per candidate:
  - `instructions: { task: "Does this passage answer the guest's question, or part of it?", passage: { article, section, text } }`
  - `true`: "The passage is about the situation the guest asks about and says what they want to know, or part of it."
  - `false`: "The passage is about a different situation or subject, even if it shares words with the question, or it does not say what the guest wants to know."
  - Stay passages use article "This stay's house rules" (section: the stay title) or "This stay's cancellation policy" (section: its title).
  - Measured: 26–27 candidates, 4.5–5k input tokens, 300–560 ms (one outlier at 2 s).
- **From probabilities to cards (code policy, tunable):**
  - Before asking, code drops KB sections attributed to a cancellation tier other than the stay's own.
  - A passage is picked at P ≥ 0.6.
  - The KB repeats itself (damage text appears in `damage`, `guest_conduct` and `liability_and_disputes`). So picked sections are grouped by attributed policy, and when a group spans entries, only the entry with the highest total P over its sections for that policy is kept.
  - At most 3 KB cards, ordered by their best P.
  - A different wording, which also gave Jev each entry's description, fixed one miss but lost two answers, so it wasn't used.
- **Cards** (`AnswerCard` gains optional `blocks: PolicyBlock[]` beside `lines`):
  - Stay rules: one card with the picked lines in `houseRuleParts` order. Title "Check-in and checkout" when only check-in/out lines, "Pets at this stay" when only the pets line, else "House rules". Source "This stay's house rules" (`home`), link "See all policies".
  - Stay cancellation: as today (title = policy title, line = `summary`, source "Cancellation policy", link "Read full policy" → `cancellation`).
  - KB: key `kb-<path>`, title = entry title as written, `blocks` = picked sections. Source label "Roam policy: <title>", "Roam policies: <a>, <b>" for several, or "Roam guest policies" when none is attributed (`policy` icon). Link: "Read full policy" → that policy's kind when there's one, else "See all policies".
  - No card: the existing `NO_ANSWER` card.
- **Caching:** the server keeps the parsed, checked snapshot for 10 minutes. A refresh reuses verdicts for entries whose Markdown and source text hash (Web Crypto SHA-256) is unchanged, so a rebuild re-checks only changed entries. Concurrent first requests share one load. If a refresh fails, the previous snapshot keeps serving. With no snapshot, or if the check itself fails, the route returns 502: unchecked text is never shown.
- **API contract:** `POST /api/ask` takes `{ slug, question }`. `slug` is ≤ 96 chars, `[a-z0-9-]`. `question` is trimmed, 1–300 chars. Validated with zod in `ask-request.ts`.
  - The route runs: `requireSession`, then the stay (CDN `STAY_QUERY`, params) and the snapshot in parallel, then the Jev pick, then the cards.
  - The response is `{ cards: AnswerCard[], topics: string[] }`. `topics` are passage ids (`kb:<path>#<n>`, `stay:<key>`), never guest text.
  - Errors: 401 (session), 400 (body), 404 `stay_not_found`, 502 `knowledge_unavailable` / `jev_failed`. Jev times out at 5 s.
  - Logs: counts and timings only.
- **The guest's question** only ever goes into Jev's state. No GROQ is built from it. A prompt-injection attempt can at worst change which checked passages are picked.
- **App:**
  - Chips send their question through the route like typed text, so all replies are the same kind of card.
  - While waiting, a Roam bubble reads "Checking Roam's policies…". It's replaced by the cards in place, with no fake delay.
  - Answers are cached per `slug` + question for the session.
  - On any failure (network, non-200, a 10 s client timeout), the reply is today's local answer: `answerFor(stay, matchTopics(text))`, or `answerFor(stay, [key])` for a chip.
  - Requests abort when the screen closes. `AskInput` gets `maxLength={300}`.
- **Welcome copy:** "Ask about check-in, pets, cancellation and more. Answers quote this stay's details and Roam's guest policies as written."
- **PostHog:** `stay_ask_sent` keeps `{ slug, from, topics, answered }`. `topics` become the server's passage ids, and a new `answeredBy` field is `"jev" | "fallback"`. Nothing the guest types is sent.
- **No new dependency or service.** `SANITY_CONTEXT_KB_URL` (already in `.env.local`) is added to `.env.example`. Server modules read it alongside `SANITY_ORGANIZATION_TOKEN` and `TYPESAFE_AI_API_KEY`, and none is `EXPO_PUBLIC_`.
- **No design attached.** The new pieces (pending bubble, KB card body) reuse `MessageBubble`, `AnswerCard` and `PolicyBody` with existing tokens, so no new tokens.
- Defaults I picked: the thresholds (0.9 check, 0.6 attribution, 0.6 pick), 3 KB cards, the 10-minute snapshot, chips through the route, the app-side fallback, the welcome copy, and the pending text.

## Out of scope
- Fixing the KB's wording. That's done in the Context app (resolve issues, add instructions, rebuild); the check picks fixes up on the next snapshot.
- Stay price facts (nightly price, cleaning fee, minimum nights) as passages, so "how much is the cleaning fee" still has no stay card.
- Follow-up questions that depend on earlier messages: each question is judged alone.
- Sanity Insights conversation recording, rate limiting, production hosting, and persisting the chat.
- Removing the keyword matcher, which stays as the fallback.

## Steps
### 1. Context tool calls and env
- In `src/lib/server/context.ts`, factor the JSON-RPC call into `callContextTool(url, name, args, signal): Promise<string>`, which returns `result.content[0].text`. Keep the same errors and code-only logs.
- `contextQuery` uses it with `SANITY_CONTEXT_MCP_URL` and still parses `{ result }`.
- Add `SANITY_CONTEXT_KB_URL=` to `.env.example`.
- Done when search still works (one `/api/search` request) and lint plus tsc pass.

### 2. KB snapshot: parse and check (`src/lib/server/kb-markdown.ts`, `src/lib/server/policy-kb.ts`)
- `kb-markdown.ts` (pure):
  - `parseOutline(text)` returns `{ kbId, paths }`.
  - `parseEntry(path, markdown)` returns `{ path, title, sources, sections: { index, heading?, blocks: PolicyBlock[], plain: string[], table: boolean }[] }`, following the parsing rules in Decisions.
- Add `POLICY_TEXT_QUERY` (`*[_type == "policy"]{ kind, title, "text": pt::text(body) }`) to `src/lib/sanity/queries.ts`.
- `policy-kb.ts`: `policyKnowledge(signal)` loads the outline, then reads each path with its own `knowledge_base_read` call (in parallel) and fetches the policies from the CDN.
  - It runs the check per entry (Decisions), reusing cached verdicts by hash.
  - It returns `{ sections: KbSection[], policies }`. Each `KbSection` carries `{ id, path, entryTitle, heading, blocks, plain, policy: { kind, title } | null }`, and only verified sections are included.
  - TTL, sharing and stale behaviour are as in Decisions.
- Done when a scratch script prints the verified sections and their attribution for the live KB, and the failing sections listed in Decisions are absent.

### 3. Picking and cards (`src/lib/server/policy-answers.ts`, `src/lib/ask.ts`)
- In `src/lib/ask.ts`, add `blocks?: PolicyBlock[]` to `AnswerCard` and make `lines` optional. Export the stay-card builders, so server and fallback build stay cards the same way.
- `answerQuestion(question, stay, knowledge, signal)` builds the candidates, makes one `experimental_decide` call (5 s timeout, `maxRetries: 1`) and applies the threshold, dedupe and cap. It returns `{ cards, topics }` (`NO_ANSWER` when empty).
- Done when a scratch script gives the Verification table's results on both stays.

### 4. API route (`src/app/api/ask+api.ts`, `src/lib/server/ask-request.ts`)
- The route follows the API contract above. It uses `HttpError`/`errorResponse`, and logs `ask { candidates, picked, kbMs, jevMs }`.
- Done when the curl checks in Verification pass.

### 5. App
- `src/hooks/use-ask.ts`: `useAsk()` returns `ask(slug, question, signal)`. It posts with `useAuth().getToken()` as a bearer token, applies a 10 s timeout and the session cache, and throws on non-200.
- `ask.tsx`:
  - Messages gain `{ id, from: "pending" }`. Sending appends the guest message and the pending bubble, then replaces the pending bubble with the answer (or the fallback answer).
  - One `AbortController` per screen, aborted on unmount.
  - New welcome copy and the PostHog fields.
- `answer-card.tsx` renders `blocks` with `PolicyBody` when present, otherwise `lines` as today.
- `ask-input.tsx` gets `maxLength={300}`.
- Done when lint and tsc pass and the screen answers from the server.

### 6. Check in the simulator
Sign in as `name+clerk_test@example.com` / `424242`. Open `exp://127.0.0.1:8081/--/stay/modern-cabin-with-hot-tub/ask` and take screenshots of:
- the pending bubble
- "can I bring my dog and when is checkout"
- "what happens if I cancel 2 days before?"
- "is there a gym"
- a chip
- the fallback, with the dev server's `TYPESAFE_AI_API_KEY` blanked

Compare them with the Cards decisions and fix any differences.

### 7. Close out
Run Verification, write the report, add `## Result`, and update AGENTS.md.

## Verification
- `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` pass. The drift greps (hex, `fontSize`/`fontFamily`, `[..]` classes outside `global.css`) are clean. Nothing in `src/app/(app)`, `src/app/stay`, `src/hooks` or `src/components` imports `src/lib/server`. No secret name appears under `EXPO_PUBLIC_`.
- curl `localhost:8081/api/ask`:
  - no token → 401
  - bad token → 401
  - `{ slug: "x", question: "" }` → 400
  - a 301-char question → 400
  - an unknown slug → 404
  - a test session token with a real question → 200 with cards
- **The check holds:** across every response below, no card contains text from the failing sections listed in Decisions, and no card contains a table.
- **Realistic questions:** expected results from the probe (v2 wording, P ≥ 0.6). Log the picked ids and P for each, and explain any difference as missing data, Jev's decision, the check, or the code.

  | Question | Lake Arrowhead (Moderate, pets) | Byron Bay (Flexible, no pets) |
  | --- | --- | --- |
  | can I bring my dog? | stay pets line + `pets` intro | "No pets" + `pets` intro |
  | can I bring my dog and when is checkout | checkout + pets lines, `pets`, `check_in_and_check_out` | checkout + pets lines, `pets` |
  | what happens if I cancel 2 days before? | stay cancellation + Moderate section only | stay cancellation + Flexible section only |
  | is there a security deposit? | `damage` intro | same |
  | the hot tub isn't working and we just arrived | `safety` (serious problems) | same |
  | my service dog comes with me, do I pay the pet fee? | `pets` "Service animals" | same |
  | can I smoke on the balcony / can we throw a small birthday party | stay smoking / parties line | same |
  | when will I get the door code | `check_in_and_check_out` intro (48 hours) | same |
  | can I get a refund | stay cancellation + its tier + serious-problem section | stay cancellation + its tier |
  | is there a gym / wifi password / apple pay / wheelchair accessible | no-answer card | same |

- Known misses to report, not fix:
  - "how much is the service fee" gets no answer, because the check drops "What the price includes".
  - "I broke a glass" on Lake Arrowhead also picks `safety` "Reporting a problem" (P 0.64), which is Jev's decision.
- **Snapshot:** a second request within 10 minutes makes no KB or check calls (server log). With `SANITY_CONTEXT_KB_URL` pointed at a missing endpoint on a fresh server, the route returns 502 and the app shows the fallback answer.
- **Fallback:** with `TYPESAFE_AI_API_KEY` blank, the route returns 502: `knowledge_unavailable` on a fresh server (the check can't run), `jev_failed` once a snapshot is cached. The chat shows today's keyword answers with `answeredBy: "fallback"`.
- **End to end in the simulator:**
  - Details → Ask → each case above → "Read full policy" opens the Policies sheet at that policy.
  - Leaving the screen mid-request causes no error and no late message.
- Not judgeable here, reported as ❌: Android, VoiceOver order, and haptics.

## AGENTS.md updates
- **Policy knowledge:** replace the line with this: Ask reads the `roam-record-guest-policies` Context endpoint (Knowledge Base mode, KB `kbcnL3rGhI30`, URL in `SANITY_CONTEXT_KB_URL`) with an organization token. `roam-policies` is built from another project; don't use it. KB entries are written by Sanity's build, so a section is shown only after Jev has checked every block against its source policies (`src/lib/server/policy-kb.ts`). Fix wording in the Context app, not in code.
- **Answer text:** replace "Until Jev routes questions… keyword matching" with this: Questions go to `POST /api/ask`. Jev picks checked KB sections and the stay's own rule lines and cancellation summary (`src/lib/server/policy-answers.ts`). Cards show them word for word with their source; KB cards render through `PolicyBody`. Keyword matching in `src/lib/ask.ts` is the fallback when the route fails.
- **Typed decisions:** add the Ask policy: the check passes a block at P(supports) ≥ 0.9, attribution counts at ≥ 0.6, a passage is picked at Noul P ≥ 0.6, one entry per policy, at most 3 KB cards, and other cancellation tiers are dropped in code.
- **Rules:** "Policy answers show only text from the stay's data and Roam's policies, word for word" becomes: "…from the stay's data, Roam's policies, or Knowledge Base sections that passed the check, word for word. Unchecked KB text is never shown."

## Result
Built as planned. Differences found while building:
- **Dev server state:** Expo's dev server re-evaluates an API route module on every request (`ssrImportApiRoute`, "TODO: Cache the evaluated function"). So the module-level snapshot never survived, and each request re-ran all 107 checks (+1.3–1.8 s). The snapshot, the in-flight load and the verdicts now live on `globalThis`. Search's `knownPlaces()` cache has the same problem in dev; it's cheap and was left alone.
- **No signal:** `policyKnowledge()` takes no signal, because the load is shared between requests. It has its own 20 s timeout.
- **Refresh in the background:** after 10 minutes the snapshot keeps serving while it refreshes, so only the very first load waits.
- **Smaller stay query:** the route reads the stay with a smaller `ASK_STAY_QUERY` (title, house rules, cancellation policy). A CDN failure returns 502 `stay_unavailable`.
- **Measured:**
  - The first load takes 1.1–3.1 s (9 entries, 37 sections, 22 shown).
  - With a warm snapshot, a request takes 0.54–0.65 s end to end (stay fetch ~30 ms, Jev 300–600 ms, 26–27 Nouls).
  - Every Verification question gave the expected cards on both stays. No text from a failing section, and no table, appeared in any response.
- **Test user:** `name+clerk_test@example.com` doesn't exist in this Clerk instance. The curl checks used `roam+clerk_test@example.com` with a Backend API session, revoked afterwards.
- **Simulator:** no tap automation is available, so a temporary `?q=` / `?chip=` seed sent the questions; it has been removed. The fallback (keyless server) and leaving mid-request were checked on a second dev server on port 8082.
- **Type check:** `npx tsc --noEmit` exits 2, but only on the 213 errors under `agent/skills/` (reference files committed in `dfd33c1`). The same errors are on `main`; the app itself has 0.

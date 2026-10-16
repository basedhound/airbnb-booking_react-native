# 10 · Ask about this stay

Status: done

## Goal
On a stay's details screen, "Ask about policies" opens a full-screen chat, "Ask about this stay". Guests type a question or tap a topic chip. Each reply is one answer card per topic. A card shows this stay's own text or Roam's policy text word for word, with a source label. Nothing is generated and there's no backend yet: topics are matched in code, and answers come from the stay already loaded by `useStay`.

## Decisions
- **Design (your answer):** none attached. The screen is built only from Roam's existing tokens and parts. Every layout value below is my choice, not a measurement, so there are no estimates to report. The simulator comparison checks it against this plan instead of an image.
- **Answer data (your answer):** each topic maps in code to fields the stay already has: `houseRuleLines`, `cancellationPolicy` and `policies` (kinds `checkIn`, `pets`, `payment`, `damage`, `guestRefund`). No new query, fetch or API route. A typed question is matched to topics by keywords in code. This is a stand-in for Jev and is replaced when policy Q&A is built.
- **Input (your answer):** a gray pill like Search's bar. It has a leading `chat` icon (`bubble.left`), the text input, and a round send button on the right (`arrowUp`). The keyboard's Send key also submits.
- **Entry (your answer):** the "Ask about policies" card pushes `/stay/[slug]/ask`, full screen, over the stay. The cancellation card still opens the Policies sheet.
- **Topics and chips** (in this order; each chip sends its question as the guest's message):
  | Chip | Question sent | Cards (source label) |
  | --- | --- | --- |
  | Cancellation | What's the cancellation policy? | `cancellationPolicy.title` + `summary` ("Cancellation policy") |
  | Check-in | When are check-in and checkout? | the check-in and checkout lines ("This stay's house rules"), then the `checkIn` policy summary ("Roam policy") |
  | Pets | Can I bring my pet? | the pets line ("This stay's house rules"), then the `pets` policy summary ("Roam policy") |
  | House rules | What are the house rules? | every `houseRuleLines` line as a list ("This stay's house rules") |
  | Payment | How does payment work? | the `payment` policy summary ("Roam policy") |
  | Damage | What if something gets damaged? | the `damage` policy summary ("Roam policy") |
  | Refunds | What if the stay isn't as described? | the `guestRefund` policy summary ("Roam policy") |
- **Keyword match** (case-insensitive, word starts). One question can match several topics, and the cards keep the table's order:
  - cancellation: `cancel`, `refund before`
  - checkIn: `check in`, `check-in`, `checkin`, `checkout`, `check out`, `arriv`, `leave`, `late`, `early`
  - pets: `pet`, `dog`, `cat`, `animal`
  - houseRules: `rule`, `smok`, `part`, `quiet`, `noise`, `event`
  - payment: `pay`, `charge`, `price`, `cost`, `fee`, `card`
  - damage: `damage`, `deposit`, `broke`
  - guestRefund: `refund`, `as described`, `issue`, `problem`
  The match lives in pure functions in `src/lib/ask.ts` so the tests below can run without the UI.
- **No match, or a topic the stay has no data for** (for example no cancellation policy): one card, "No answer in this stay's details", with the body "Roam's policies and this stay's details don't cover this. Contact Roam support." and no source. This follows the rule to say so and point to support.
- **Policy cards show the `summary`** word for word, plus a "Read full policy" link that opens the Policies sheet scrolled to that policy. `section` changes from only `cancellation` to any policy kind (`cancellation`, `checkIn`, `pets`, `payment`, `damage`, `guestRefund`), and the sheet scrolls to that section's measured y. House-rule cards have a "See all policies" link that opens the sheet at the top.
- **Opening state:** one Roam message, "Ask about check-in, pets, cancellation and more. Answers come word for word from this stay's details and Roam's policies." The chips sit above the input and stay visible for the whole chat. There's no seeded sample exchange.
- **Replies arrive instantly.** There's no fake typing delay, because nothing is being computed.
- **Messages are kept in component state only.** They're lost when the screen closes, and nothing is persisted.
- **Empty or whitespace input:** the send button is disabled (`opacity-40`), and Send on the keyboard does nothing.
- **Loading and errors:** the screen uses `useStay(slug)`, which is usually already cached from the details screen. While it loads, the header shows and the body shows "Loading this stay…". If loading fails: "We couldn't load this stay." plus "Try again" (`retry`). If the stay isn't found: "This stay isn't available anymore." plus "Back". The input is hidden in every state except loaded.
- **Haptics:** `selectionAsync` once per send (chip or button).
- **PostHog:** `stay_ask_opened { slug }` and `stay_ask_sent { slug, from: "chip" | "typed", topics: string[], answered: boolean }`. Topic keys only. The guest's text is never sent. `stay_policies_opened` gains `from: "ask_answer"`.
- **No new dependencies.** Keyboard handling uses React Native's `KeyboardAvoidingView` (`behavior="padding"` on iOS). The message list is a `ScrollView` that calls `scrollToEnd` on content size change.

### Motion (per the expo-animation skill)
| What | Purpose | Implementation |
| --- | --- | --- |
| Open Ask | spatial | Native Stack push |
| New message and its cards | orientation | Reanimated `FadeInDown` (`motion.base`, `motion.easeOut`), builder at module scope with `reduceMotion(ReduceMotion.System)` |
| Chips, send, card links | feedback | `Chip` and `PressableScale` (0.97, 120 ms) as they are |
| Keyboard | spatial | `KeyboardAvoidingView` follows the system keyboard |

### Layout (pt)
- Root: `View flex-1 bg-surface`, with a `paddingTop` of `insets.top`, then the `KeyboardAvoidingView flex-1`. The native header is hidden (`headerShown: false`, as on details).
- **Header** `flex-row items-center gap-3 px-5 py-2 border-b border-border`: `IconButton` `chevronLeft` (variant `muted`, size `nav`), then a `flex-1` column with `title` "Ask about this stay" and `caption` tone `muted` with the stay title (1 line).
- **Messages** `ScrollView flex-1`, `contentContainerClassName="gap-4 px-5 py-5"`.
  - Roam message: `self-start mr-12 rounded-lg bg-surface-muted px-4 py-3` with `body` text. A margin limits the width, since arbitrary classes like `max-w-[85%]` aren't allowed.
  - Guest message: `self-end ml-12 rounded-lg bg-lavender px-4 py-3` with `body` text.
  - Reply: `self-stretch gap-2.5`, one `AnswerCard` per topic.
- **AnswerCard** `rounded-lg bg-lavender-soft p-4 gap-2`:
  - Source row `flex-row items-center gap-1.5`: `Icon` 16 tone `accent` (`home` for house rules, `policy` for policies), then `footnote` tone `accent` with the source label ("This stay's house rules", "Cancellation policy", "Roam policy").
  - `subtitle` title: the topic ("Check-in and checkout", "Pets", …), or the policy's `title` for policy cards.
  - Text: `body`, one `Text` per line for house rules (`gap-1`), or the policy `summary`.
  - Link: `link` tone `accent` "Read full policy" / "See all policies", `self-start` with `hitSlop` 8.
  - The no-answer card uses `bg-surface-muted`, has no source row, and has no link.
- **Composer** `border-t border-border bg-surface pt-3 gap-3`, with `paddingBottom` of `insets.bottom + 8` while the keyboard is closed and `8` while it's open:
  - Chips: the same horizontal row as `SearchChips` (`Chip size="xs" variant="filled"`, `gap-2.5 px-5`, never selected).
  - Input pill `mx-5 h-13 flex-row items-center gap-3 rounded-full bg-surface-muted pl-4 pr-1.5`: `Icon` `chat` 22, then `TextInput` (`text-input` only, placeholder "Ask about this stay", `returnKeyType="send"`, `submitBehavior="submit"` so the keyboard stays open), then the send `IconButton` `arrowUp` (new variant `primary`, size `sm` → `size-10` (new size `send`), icon 20, `accessibilityLabel="Send"`).

### Proposed new tokens and registry entries
- No new colors, type, radii, spacing or shadows.
- Icon `arrowUp`: `arrow.up` / `arrow_upward`.
- `IconButton` variant `primary` (`bg-primary`) and size `send` (`size-10`, icon 20).

## Out of scope
- A real backend: no API route, Context endpoint, Jev, Clerk-verified calls or embeddings.
- Generated text of any kind.
- Persisting chats, chat history, or analytics on what guests type.
- Full policy bodies inside cards (the link opens them in the sheet).
- Android-specific layout tuning beyond what the shared components already do.
- A design comparison against an image (none exists).

## Steps
### 1. Answer logic
Create `src/lib/ask.ts` with:
- `TopicKey`, `TOPICS` (key, chip label, question, keywords, in the table's order) and `matchTopics(text): TopicKey[]`.
- `AnswerCard` (`{ key, title, lines: string[], source?: { label, icon }, link?: { label, section?: string } }`) and `answerFor(stay: StayDetails, topics: TopicKey[]): AnswerCard[]`.
  `answerFor` builds cards from `houseRuleLines`, `cancellationPolicy` and `policies` only, returns the no-answer card when nothing applies, and drops a topic whose data is missing.

Check with a one-off script (`npx tsx` in the scratchpad, or `node --experimental-strip-types`) against the live `STAY_QUERY` result for `modern-cabin-with-hot-tub` and one no-pets stay. Every card line must equal its source string exactly. Lint and tsc pass.

### 2. Design-system pieces
Add the `arrowUp` icon, plus `IconButton` variant `primary` and size `send`. Show the send button in `/design-system`.

### 3. Components
Create `src/components/ask/`:
- `answer-card.tsx`
- `message-bubble.tsx` (Roam and guest)
- `topic-chips.tsx` (the chip row; it calls `onAsk(topic)`)
- `ask-input.tsx` (the pill: leading icon, input, send; it calls `onSend(text)` and clears the field)

### 4. Route and wiring
- Add `src/app/stay/[slug]/ask.tsx`, registered in `src/app/_layout.tsx` next to the other stay screens (plain push, `headerShown: false`).
- The screen keeps `messages` state: `{ id, from: "roam" | "guest", text }` or `{ id, from: "answer", cards }`. Sending appends the guest message and then the answer from `answerFor(stay, topics)`; a chip passes its topic directly.
- On the details screen, "Ask about policies" pushes `/stay/[slug]/ask`.
- In `policies.tsx`, `section` accepts any policy kind and scrolls to it.
- Add the events.

### 5. Check in the simulator
- Open `xcrun simctl openurl booted "exp://127.0.0.1:8081/--/stay/modern-cabin-with-hot-tub/ask"` and take screenshots of:
  - the opening state
  - after each chip
  - after a typed multi-topic question ("can I bring my dog and when is checkout")
  - an unmatched question ("is there a gym")
  - the keyboard open
  - the loading state and `/stay/nope/ask`
- Compare each against the Layout section, list the differences, and fix them.

## Verification
- `npx expo lint`, `npx tsc --noEmit` and `npx expo-doctor` pass. Drift greps find no hex, `fontSize`/`fontFamily` literals or `[..]` classes outside `src/global.css`.
- Logic script, on live data:
  - Every chip on Lake Arrowhead gives the expected cards.
  - Card text equals the Sanity / `houseRuleLines` strings exactly.
  - A no-pets stay answers Pets with "No pets".
  - "can I bring my dog and when is checkout" gives `[checkIn, pets]`.
  - "is there a gym" gives the no-answer card.
  - Empty and whitespace-only input sends nothing.
- Simulator:
  - Details → Ask → back.
  - Each chip sends its question and its cards.
  - Typed send works with both the button and the keyboard's Send key.
  - "Read full policy" opens the Policies sheet at that policy.
  - The list scrolls to the newest message.
  - The input stays above the keyboard.
  - The cancellation card on details still opens the Policies sheet.
- Not judgeable here, reported as ❌: haptics, Android, VoiceOver order, and taps if the simulator can't be driven.

## AGENTS.md updates
- **Answer text:** replace the line "'Ask about policies' opens the Policies sheet until policy Q&A is built" with: "'Ask about policies' opens `/stay/[slug]/ask`. Replies are answer cards, one per topic, with the stay's or Roam's text word for word and a source label. Until Jev routes questions, topics come from keyword matching in `src/lib/ask.ts`, and the answers come from the stay already loaded by `useStay`."
- **Design system:** `ask` is a pushed screen beside `policies` and `host`. The Policies sheet's `section` accepts any policy kind.

## Result
Built as planned. Changes made while building:
- `houseRuleLines` is now built on `houseRuleParts` (keyed lines) in `src/lib/stay-details.ts`, so Ask picks the check-in, checkout and pets lines by key instead of matching strings.
- The guest refund keyword is `as described` (not `not as described`), so "isn't as described" matches.
- The Policies sheet scrolls to a section through one `onSectionLayout(kind, e)` handler. A curried handler failed the `react-hooks/refs` lint rule.
- Checks run: lint, tsc, expo-doctor 18/18, and the drift greps. A logic script ran on live data for Lake Arrowhead, Byron Bay (no pets) and Desert Modern Villa (additional rules): every card line equals its source string, and the matching cases pass.
- Simulator screenshots: the opening state, a cancellation question plus a multi-topic question, and house rules plus an unmatched question. To get the replies on screen, a temporary `?q=` seed was added and then removed, because no tap automation was available.
- Not exercised: real taps (chips, send, links into the Policies sheet), the keyboard, haptics, the loading and not-found states, and Android.

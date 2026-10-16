# 11 · Ask about this stay label + Good to know

Status: done

## Goal
On a stay's details screen, the Ask card reads "Ask about this stay", and a new "Good to know" section shows the stay's key house rules directly, above the Ask card.

## Decisions
- **Rename:** the card title "Ask about policies" becomes "Ask about this stay", the same words as the chat screen's header. The subtitle stays "Cancellation, house rules, pets, check-in and more."
- **Info (your answer):** the key house rules, from `houseRuleParts(stay.houseRules)`, in this order:
  - check-in
  - checkout
  - quiet hours (only when set)
  - pets
  - smoking
  - parties

  Each line is the same text as in the Policies sheet, word for word. The host's `additionalRules` aren't listed. When a stay has any, a "Show all rules" link opens the Policies sheet. The cancellation card already shows its summary, so it isn't repeated.
- **Placement (your answer):** after the amenities divider and before the Ask card. With no amenity tags, the section starts right under the place line.
- **Icons:**
  | Rule | Icon (iOS / Android) | New? |
  | --- | --- | --- |
  | check-in, checkout | `clock`: `clock` / `schedule` | new |
  | quiet hours | `moon`: `moon` / `bedtime` | new |
  | pets | `pets` | existing |
  | smoking | `smoking`: `nosign` / `smoke_free` | new |
  | parties | `party`: `party.popper` / `celebration` | new |

  Every rule uses the same glyph whether it's allowed or not; the text says which.
- **PostHog:** `stay_policies_opened` gains `from: "good_to_know"`.
- **No new tokens or dependencies.**

### Layout (pt)
- Section `mt-5 gap-3`:
  - `title` "Good to know"
  - rows `gap-2.5`, each `flex-row items-center gap-3`, with `Icon` 20 tone `ink` and `body` text
  - an optional `link` tone `accent` "Show all rules"
- Then a divider `mt-5 h-px bg-border`, and the cards keep their `-mx-1 mt-1.5`.
- The divider under amenities stays as it is (and stays hidden with no tags).

## Out of scope
- Roam's policy summaries on the details screen.
- Changes to the chat, the Policies sheet or the data.

## Steps
### 1. Icons and component
- Add `clock`, `moon`, `smoking` and `party` to `src/components/ui/icons.ts`, and confirm that each SF name renders.
- Create `src/components/stay/good-to-know.tsx` (`rules: HouseRules`, `onShowAll`). It maps `HouseRuleKey` to an icon and skips `additional`.

### 2. Details screen
In `src/app/stay/[slug]/index.tsx`:
- Rename the card.
- Insert the section with its divider.
- Wire "Show all rules" to the Policies sheet with the event.

## Verification
- Lint, tsc and the drift greps pass.
- Simulator screenshots:
  - Lake Arrowhead: 6 rows with quiet hours, and no link.
  - Byron Bay: 5 rows, "No pets".
  - Desert Modern Villa: the "Show all rules" link.
- Each row's text equals its Policies sheet line.

## AGENTS.md updates
- **Answer text:** "Ask about policies" becomes "Ask about this stay" (the card). Stay details show the key house rules lines in "Good to know"; additional rules stay in the sheet.

## Result
Built as planned.
- Lint and tsc pass, and the drift grep is clean.
- All four new SF symbols render (`clock`, `moon`, `nosign`, `party.popper`).
- Simulator screenshots match the expected rows:
  - Lake Arrowhead: 6 rows with quiet hours, and no link.
  - Byron Bay: 5 rows, "No pets", and no link.
  - Desert Modern Villa: 6 rows plus "Show all rules".
- To screenshot below the fold, a temporary `contentOffset` was added and then removed. That's also why the status bar reads light over white content in those shots; real scrolling switches it to dark.
- Not exercised: tapping "Show all rules" (no tap automation).

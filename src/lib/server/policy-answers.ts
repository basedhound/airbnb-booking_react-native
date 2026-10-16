import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_decide, type Experimental_DecisionQuestion } from "ai";

import { cancellationCard, NO_ANSWER, pickedRulesCard, type AnswerCard, type AskStay } from "@/lib/ask";
import { houseRuleParts, type HouseRuleKey } from "@/lib/stay-details";
import type { StayDetails } from "@/lib/stays";

import { HttpError } from "./http";
import type { CheckedSection, PolicyKnowledge } from "./policy-kb";

// Server only. One question in, answer cards out. Every passage (a checked KB
// section, one of the stay's house-rule lines, or its cancellation summary)
// gets one Noul: does it answer the guest's question, or part of it? Code owns
// the threshold, the dedupe and the cards; Jev never writes text.

const MODEL = "jev-latest";
const TIMEOUT_MS = 5000;

// Tuned on realistic questions (prompts/13-ask-knowledge-base.md).
const PICK_AT = 0.6;
const MAX_KB_CARDS = 3;

const pickCriteria = {
  true: "The passage is about the situation the guest asks about and says what they want to know, or part of it.",
  false:
    "The passage is about a different situation or subject, even if it shares words with the question, or it does not say what the guest wants to know.",
};

type Candidate = { id: string; passage: { article: string; section: string; text: string } } & (
  | { kind: "rule"; rule: { key: HouseRuleKey; text: string } }
  | { kind: "cancellation" }
  | { kind: "kb"; section: CheckedSection }
);

export type AskStayDetails = AskStay & Pick<StayDetails, "title">;

function candidatesFor(stay: AskStayDetails, knowledge: PolicyKnowledge): Candidate[] {
  const rules: Candidate[] = houseRuleParts(stay.houseRules).map((rule, i) => ({
    id: rule.key === "additional" ? `stay:additional${i}` : `stay:${rule.key}`,
    kind: "rule",
    rule,
    passage: { article: "This stay's house rules", section: stay.title, text: rule.text },
  }));
  const cancellation: Candidate[] = stay.cancellationPolicy?.summary
    ? [
        {
          id: "stay:cancellation",
          kind: "cancellation",
          passage: { article: "This stay's cancellation policy", section: stay.cancellationPolicy.title, text: stay.cancellationPolicy.summary },
        },
      ]
    : [];
  // Another tier's rules don't apply to this stay, so Jev never sees them.
  const kb: Candidate[] = knowledge.sections
    .filter((s) => s.policy?.kind !== "cancellation" || s.policy.title === stay.cancellationPolicy?.title)
    .map((section) => ({
      id: section.id,
      kind: "kb",
      section,
      passage: {
        article: section.entryTitle,
        section: section.heading ?? "Introduction",
        text: section.plain.map((b) => (b.bullet ? `- ${b.text}` : b.text)).join("\n"),
      },
    }));
  return [...rules, ...cancellation, ...kb];
}

function kbCard(sections: CheckedSection[]): AnswerCard {
  const policies = [...new Map(sections.flatMap((s) => (s.policy ? [[s.policy.title, s.policy] as const] : []))).values()];
  const label =
    policies.length === 0
      ? "Roam guest policies"
      : `${policies.length === 1 ? "Roam policy" : "Roam policies"}: ${policies.map((p) => p.title).join(", ")}`;
  return {
    key: `kb-${sections[0].path}`,
    title: sections[0].entryTitle,
    blocks: [...sections].sort((a, b) => a.index - b.index).flatMap((s) => s.blocks),
    source: { label, icon: "policy" },
    link: policies.length === 1 ? { label: "Read full policy", section: policies[0].kind } : { label: "See all policies" },
  };
}

export async function answerQuestion(
  question: string,
  stay: AskStayDetails,
  knowledge: PolicyKnowledge,
  signal?: AbortSignal,
): Promise<{ cards: AnswerCard[]; topics: string[]; candidates: number }> {
  const candidates = candidatesFor(stay, knowledge);
  const questions: Record<string, Experimental_DecisionQuestion> = {};
  for (const c of candidates) {
    questions[c.id] = {
      type: "boolean",
      instructions: { task: "Does this passage answer the guest's question, or part of it?", passage: c.passage },
      criteria: pickCriteria,
    };
  }

  let p: Record<string, number>;
  try {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const result = await experimental_decide({
      model: typeSafeAi.decisionModel(MODEL),
      state: { question, stay: { title: stay.title, cancellationPolicy: stay.cancellationPolicy?.title ?? null } },
      questions,
      maxRetries: 1,
      abortSignal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const answers = result.answers as Record<string, { type?: string; probability?: number } | undefined>;
    p = Object.fromEntries(candidates.map((c) => [c.id, answers[c.id]?.type === "boolean" ? (answers[c.id]?.probability ?? 0) : 0]));
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn("ask jev failed", error instanceof Error ? error.name : typeof error);
    throw new HttpError(502, "jev_failed");
  }

  const picked = candidates.filter((c) => p[c.id] >= PICK_AT);
  const rules = picked.flatMap((c) => (c.kind === "rule" ? [c.rule] : []));
  const stayCards = [
    pickedRulesCard(rules),
    picked.some((c) => c.kind === "cancellation") ? cancellationCard(stay) : null,
  ].filter((card): card is AnswerCard => card !== null);

  // The KB repeats itself (damage rules live in three entries). Per source
  // policy, keep only the entry whose sections for that policy score highest.
  const kb = candidates.flatMap((c) => (c.kind === "kb" ? [c] : []));
  const group = (c: (typeof kb)[number]) => c.section.policy?.title ?? c.id;
  const kept: typeof kb = [];
  for (const g of new Set(kb.filter((c) => p[c.id] >= PICK_AT).map(group))) {
    const inGroup = kb.filter((c) => group(c) === g);
    const score = (path: string) => inGroup.filter((c) => c.section.path === path).reduce((n, c) => n + p[c.id], 0);
    const best = [...new Set(inGroup.filter((c) => p[c.id] >= PICK_AT).map((c) => c.section.path))].sort((a, b) => score(b) - score(a))[0];
    kept.push(...inGroup.filter((c) => c.section.path === best && p[c.id] >= PICK_AT));
  }
  const byEntry = new Map<string, typeof kb>();
  for (const c of kept) byEntry.set(c.section.path, [...(byEntry.get(c.section.path) ?? []), c]);
  const kbEntries = [...byEntry.values()]
    .sort((a, b) => Math.max(...b.map((c) => p[c.id])) - Math.max(...a.map((c) => p[c.id])))
    .slice(0, MAX_KB_CARDS);

  const cards = [...stayCards, ...kbEntries.map((entry) => kbCard(entry.map((c) => c.section)))];
  const topics = [
    ...picked.filter((c) => c.kind !== "kb").map((c) => c.id),
    ...kbEntries.flat().map((c) => c.id),
  ];
  return cards.length ? { cards, topics, candidates: candidates.length } : { cards: [NO_ANSWER], topics: [], candidates: candidates.length };
}

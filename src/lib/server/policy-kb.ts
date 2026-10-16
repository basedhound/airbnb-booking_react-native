import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_decide, type Experimental_DecisionQuestion } from "ai";

import { sanityQuery } from "@/lib/sanity/fetch";
import { POLICY_TEXT_QUERY } from "@/lib/sanity/queries";
import type { PolicyBlock } from "@/lib/stays";

import { callContextTool } from "./context";
import { HttpError } from "./http";
import { parseEntry, parseOutline, type KbEntry } from "./kb-markdown";

// Server only. Roam's guest-policy Knowledge Base (`roam-record-guest-policies`,
// SANITY_CONTEXT_KB_URL), read once and kept as a checked snapshot. Entries are
// written by Sanity's build, not by Roam, so before any section can be shown
// Jev checks every block against the full text of the policies the entry was
// built from. A section is kept only if every block passes. Unchecked text is
// never returned.

const MODEL = "jev-latest";
const TTL = 10 * 60 * 1000;
const LOAD_TIMEOUT_MS = 20000;

// Tuned on the live KB (prompts/13-ask-knowledge-base.md).
const SUPPORTED_AT = 0.9;
const ATTRIBUTED_AT = 0.6;

export type PolicyText = { kind: string; title: string; text: string };
export type PolicyRef = { kind: string; title: string };

export type CheckedSection = {
  /** `kb:<path>#<index>`, also what analytics sees. */
  id: string;
  path: string;
  index: number;
  entryTitle: string;
  heading: string | null;
  blocks: PolicyBlock[];
  plain: { text: string; bullet: boolean }[];
  /** The Roam policy this section was built from, when one clearly is. */
  policy: PolicyRef | null;
};

export type PolicyKnowledge = { sections: CheckedSection[]; policies: PolicyText[]; loadedAt: number };

type SectionVerdict = { index: number; verified: boolean; policy: string | null };

const verdictCriteria = {
  supports: "The policies state everything the passage says, or directly imply it.",
  partly: "The policies state some of what the passage says, but the passage also says something the policies do not.",
  contradicts: "The policies say something different from the passage on a point the passage makes.",
  says_nothing: "The policies do not address what the passage says.",
};

function probabilities(answer: unknown): Record<string, number> {
  const a = answer as { type?: string; choice?: string; probabilities?: Record<string, number> } | undefined;
  if (a?.type !== "choice" || !a.choice) return {};
  return a.probabilities ?? { [a.choice]: 1 };
}

/** One request per entry: is each block supported, and which policy is each section from? */
async function checkEntry(entry: KbEntry, sources: PolicyText[], signal: AbortSignal): Promise<SectionVerdict[]> {
  const questions: Record<string, Experimental_DecisionQuestion> = {};
  for (const section of entry.sections) {
    if (section.table) continue;
    section.plain.forEach((block, i) => {
      questions[`v:${section.index}:${i}`] = {
        type: "choice",
        instructions: {
          task: "How do Roam's policies in `policies` relate to this passage from a guest help article built from them?",
          article: entry.title,
          section: section.heading ?? "Introduction",
          passage: block.text,
        },
        criteria: verdictCriteria,
      };
    });
    if (sources.length > 1) {
      questions[`a:${section.index}`] = {
        type: "choice",
        instructions: {
          task: "Which of Roam's policies in `policies` is this section of a guest help article taken from?",
          article: entry.title,
          section: section.heading ?? "Introduction",
          passage: section.plain.map((b) => b.text).join("\n"),
        },
        criteria: Object.fromEntries([...sources.map((p) => [p.title, null]), ["none", "None of them"]]),
      };
    }
  }
  if (!Object.keys(questions).length) return [];

  const result = await experimental_decide({
    model: typeSafeAi.decisionModel(MODEL),
    state: { policies: sources.map(({ title, text }) => ({ title, text })) },
    questions,
    maxRetries: 1,
    abortSignal: signal,
  });
  const answers = result.answers as Record<string, unknown>;

  return entry.sections.map((section) => {
    const verified =
      !section.table && section.plain.every((_, i) => (probabilities(answers[`v:${section.index}:${i}`]).supports ?? 0) >= SUPPORTED_AT);
    let policy: string | null = sources.length === 1 ? sources[0].title : null;
    if (sources.length > 1) {
      const [top, p] = Object.entries(probabilities(answers[`a:${section.index}`])).sort((a, b) => b[1] - a[1])[0] ?? [];
      if (top && top !== "none" && p >= ATTRIBUTED_AT) policy = top;
    }
    return { index: section.index, verified, policy };
  });
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// The dev server evaluates API routes afresh on every request, so module state
// wouldn't survive and every request would re-run every check. State lives on
// globalThis instead (one per server process either way).
type KbState = {
  current?: PolicyKnowledge;
  loading?: Promise<PolicyKnowledge>;
  /** Verdicts per entry, by a hash of its Markdown and its sources' text, so a
   * KB rebuild re-checks only the entries that changed. */
  verdicts: Map<string, SectionVerdict[]>;
};
const store = globalThis as typeof globalThis & { __roamPolicyKb?: KbState };
const state: KbState = (store.__roamPolicyKb ??= { verdicts: new Map() });
const verdicts = state.verdicts;

async function load(): Promise<PolicyKnowledge> {
  const started = Date.now();
  const signal = AbortSignal.timeout(LOAD_TIMEOUT_MS);
  const url = process.env.SANITY_CONTEXT_KB_URL;

  const [outlineText, policies] = await Promise.all([
    callContextTool(url, "initial_context", {}, signal),
    sanityQuery<PolicyText[]>(POLICY_TEXT_QUERY, {}, signal),
  ]);
  const outline = parseOutline(outlineText);
  if (!outline?.paths.length) throw new Error("empty outline");

  // One read per path keeps each entry's Markdown tied to its path. All or nothing.
  const entries = await Promise.all(
    outline.paths.map(async (path) =>
      parseEntry(path, await callContextTool(url, "knowledge_base_read", { knowledgeBase: outline.kbId, paths: [path] }, signal)),
    ),
  );

  const byTitle = new Map(policies.map((p) => [p.title, p]));
  const keys = new Set<string>();
  let checked = 0;
  const sections: CheckedSection[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      // An entry whose sources aren't Roam policies can't be checked, so it isn't shown.
      const sources = entry.sources.map((title) => byTitle.get(title)).filter((p): p is PolicyText => !!p);
      if (!sources.length) return;
      const key = await sha256(JSON.stringify([entry, sources]));
      keys.add(key);
      let entryVerdicts = verdicts.get(key);
      if (!entryVerdicts) {
        entryVerdicts = await checkEntry(entry, sources, signal);
        verdicts.set(key, entryVerdicts);
        checked++;
      }
      for (const verdict of entryVerdicts) {
        const section = entry.sections.find((s) => s.index === verdict.index);
        if (!section || !verdict.verified) continue;
        const policy = verdict.policy ? byTitle.get(verdict.policy) : undefined;
        sections.push({
          id: `kb:${entry.path}#${section.index}`,
          path: entry.path,
          index: section.index,
          entryTitle: entry.title,
          heading: section.heading,
          blocks: section.blocks,
          plain: section.plain,
          policy: policy ? { kind: policy.kind, title: policy.title } : null,
        });
      }
    }),
  );
  for (const key of verdicts.keys()) if (!keys.has(key)) verdicts.delete(key);

  // Outline order, then section order, so cards read like the KB.
  const order = new Map(outline.paths.map((path, i) => [path, i]));
  sections.sort((a, b) => order.get(a.path)! - order.get(b.path)! || a.index - b.index);
  const total = entries.reduce((n, e) => n + e.sections.length, 0);
  console.info("kb loaded", { entries: entries.length, sections: total, shown: sections.length, checked, ms: Date.now() - started });
  return { sections, policies, loadedAt: Date.now() };
}

function refresh() {
  state.loading ??= load()
    .then((knowledge) => (state.current = knowledge))
    .finally(() => {
      state.loading = undefined;
    });
  return state.loading;
}

/**
 * The checked snapshot. Only the first load waits; after 10 minutes the
 * snapshot keeps serving while a refresh runs, and keeps serving if it fails.
 */
export async function policyKnowledge(): Promise<PolicyKnowledge> {
  const { current } = state;
  if (current) {
    if (Date.now() - current.loadedAt > TTL) {
      refresh().catch((error: unknown) => console.warn("kb refresh failed", error instanceof Error ? error.name : typeof error));
    }
    return current;
  }
  try {
    return await refresh();
  } catch (error) {
    console.warn("kb load failed", error instanceof HttpError ? error.code : error instanceof Error ? error.name : typeof error);
    throw new HttpError(502, "knowledge_unavailable");
  }
}

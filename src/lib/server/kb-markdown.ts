import type { PolicyBlock, PolicySpan } from "@/lib/stays";

// Server only. Reads the Markdown that the Knowledge Base tools return, so Ask
// can show KB sections word for word through PolicyBody. An entry looks like:
//   # Title
//   One-line description of what the entry covers (not shown)
//   Intro paragraphs…
//   ## Section heading
//   Paragraphs and "- " bullets, with **bold** and [1] citation markers
//   ## Sources
//   1. <policy title> — Dataset
// Citation markers are dropped (cards name their sources instead); every other
// character stays as written. Sections holding a table are flagged, never shown.

export type KbOutline = { kbId: string; paths: string[] };

export type KbSection = {
  /** Order within the entry; the intro, when present, is 0. */
  index: number;
  heading: string | null;
  /** The heading (as h3) then the content, ready for PolicyBody. */
  blocks: PolicyBlock[];
  /** Each content block's text, without bullets or bold, for Jev. */
  plain: { text: string; bullet: boolean }[];
  table: boolean;
};

export type KbEntry = { path: string; title: string; sources: string[]; sections: KbSection[] };

/** The first Knowledge Base on the endpoint: its id and every entry path in its outline. */
export function parseOutline(text: string): KbOutline | null {
  const id = text.match(/Knowledge base id: `(kb[A-Za-z0-9]+)`/);
  if (!id) return null;
  const outline = text.slice((id.index ?? 0) + id[0].length);
  // Paths are bare lines, optionally tagged; summaries and topics are indented.
  const paths = [...outline.matchAll(/^([a-z0-9][a-z0-9_/-]*)(?: \[(?:core|peripheral)\])?$/gm)].map((m) => m[1]);
  return { kbId: id[1], paths: [...new Set(paths)] };
}

const CITATIONS = /\s*(?:\[\d+\])+/g;

function spans(text: string, key: string): PolicySpan[] {
  const clean = text.replace(CITATIONS, "");
  const parts = clean.split("**");
  // Unbalanced markers stay as written.
  if (parts.length % 2 === 0) return [{ _key: `${key}.0`, text: clean }];
  return parts
    .map((part, i) => ({ _key: `${key}.${i}`, text: part, marks: i % 2 ? ["strong"] : [] }))
    .filter((span) => span.text);
}

const plainText = (text: string) => text.replace(CITATIONS, "").replace(/\*\*/g, "").trim();

export function parseEntry(path: string, markdown: string): KbEntry {
  const paragraphs = markdown.trim().split(/\n\s*\n/);
  const title = (paragraphs.shift() ?? "").replace(/^#\s+/, "").trim();
  // The description line describes the entry rather than stating policy.
  if (paragraphs.length > 1 && !/^(#|- |\|)/.test(paragraphs[0]) && !paragraphs[0].includes("\n")) paragraphs.shift();

  const drafts: { heading: string | null; lines: string[][] }[] = [{ heading: null, lines: [] }];
  const sources: string[] = [];
  let inSources = false;

  for (const paragraph of paragraphs) {
    const heading = paragraph.match(/^##\s+(.+)$/);
    if (heading && !paragraph.includes("\n")) {
      inSources = heading[1].trim() === "Sources";
      if (!inSources) drafts.push({ heading: heading[1].trim(), lines: [] });
      continue;
    }
    if (inSources) {
      for (const line of paragraph.split("\n")) {
        const source = line.match(/^(\d+)\.\s+(.+?)\s+—\s+\S.*$/);
        if (source) sources[Number(source[1]) - 1] = source[2].trim();
      }
      continue;
    }
    drafts[drafts.length - 1].lines.push(paragraph.split("\n"));
  }

  const sections: KbSection[] = [];
  for (const draft of drafts) {
    const index = sections.length;
    const id = `${path}.${index}`;
    const blocks: PolicyBlock[] = [];
    const plain: KbSection["plain"] = [];
    let table = false;
    const push = (text: string, bullet: boolean) => {
      const key = `${id}.${blocks.length}`;
      blocks.push({ _key: key, _type: "block", style: "normal", ...(bullet ? { listItem: "bullet" } : {}), children: spans(text, key) });
      plain.push({ text: plainText(text), bullet });
    };
    for (const lines of draft.lines) {
      // Consecutive text lines are one paragraph; each bullet or numbered line is its own block.
      let run: string[] = [];
      const flush = () => {
        if (run.length) push(run.join(" "), false);
        run = [];
      };
      for (const line of lines) {
        if (line.startsWith("|")) table = true;
        else if (line.startsWith("- ")) {
          flush();
          push(line.slice(2), true);
        } else if (/^\d+\.\s/.test(line)) {
          flush();
          push(line, false);
        } else run.push(line);
      }
      flush();
    }
    if (!plain.length && !table) continue;
    if (draft.heading) {
      blocks.unshift({ _key: `${id}.h`, _type: "block", style: "h3", children: [{ _key: `${id}.h.0`, text: draft.heading }] });
    }
    sections.push({ index, heading: draft.heading, blocks, plain, table });
  }

  return { path, title, sources: sources.filter(Boolean), sections };
}

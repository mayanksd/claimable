export const VERDICTS = ["COVERED", "PARTLY COVERED", "NOT COVERED", "NOT IN YOUR DOCUMENTS"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type ParsedAnswer = {
  verdict: Verdict | null;
  body: string;
  source: string | null;
  followups: string[];
};

const FOLLOWUPS_RE = /^\s*[*_]*FOLLOW-?UPS[*_]*\s*:[*_]*\s*(.*)$/i;
const SOURCE_RE = /^\s*[*_]*sources?[*_]*\s*:/i;

/** "**COVERED**", "## COVERED", "`COVERED`" → "COVERED" */
const bare = (line: string) => line.replace(/[*_`#>]/g, "").trim();

export function parseFollowups(raw: string): string[] {
  return raw
    .split("|")
    .map((q) => q.trim().replace(/^["“'<]+|["”'>]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Splits a chat answer into:
 * - verdict: only if the first non-empty line, minus markdown and whitespace, is exactly one of the four labels
 * - body (markdown), source line ("Source: p.2"), and follow-up questions from the "FOLLOWUPS:" line.
 * With `partial` (still streaming), a trailing half-written "FOLLOW…" line is hidden too.
 */
export function parseAnswer(text: string, { partial = false } = {}): ParsedAnswer {
  let lines = text.replace(/\r/g, "").split("\n");

  let verdict: Verdict | null = null;
  const first = lines.findIndex((l) => l.trim() !== "");
  if (first >= 0) {
    const label = bare(lines[first]);
    verdict = (VERDICTS as readonly string[]).includes(label) ? (label as Verdict) : null;
    if (verdict) lines.splice(first, 1);
  }

  let followups: string[] = [];
  lines = lines.filter((l) => {
    const m = l.match(FOLLOWUPS_RE);
    if (m) followups = parseFollowups(m[1]);
    return !m;
  });
  if (partial) {
    const lastLine = bare(lines[lines.length - 1] ?? "").toUpperCase();
    if (lastLine && "FOLLOWUPS:".startsWith(lastLine)) lines.pop();
  }

  let source: string | null = null;
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length && SOURCE_RE.test(lines[lines.length - 1])) {
    source = bare(lines.pop()!);
  }

  return { verdict, body: lines.join("\n").trim(), source, followups };
}

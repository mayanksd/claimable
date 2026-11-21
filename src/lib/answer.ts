export const VERDICTS = ["PARTLY COVERED", "NOT IN YOUR DOCUMENTS", "NOT COVERED", "COVERED"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type ParsedAnswer = { verdict: Verdict | null; body: string; source: string | null };

/** Splits a chat answer into verdict (line 1), markdown body, and the trailing "Source:" line. */
export function parseAnswer(text: string): ParsedAnswer {
  const lines = text.trim().split("\n");
  const first = (lines[0] ?? "").replace(/[*_`]/g, "").trim().toUpperCase();
  const verdict = VERDICTS.find((v) => first === v || first.startsWith(v + " ")) ?? null;
  if (verdict) lines.shift();
  let source: string | null = null;
  const last = lines.length - 1;
  if (last >= 0 && /^\s*source[s]?:/i.test(lines[last])) {
    source = lines[last].trim();
    lines.pop();
  }
  return { verdict, body: lines.join("\n").trim(), source };
}

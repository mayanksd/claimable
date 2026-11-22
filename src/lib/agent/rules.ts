// Step 1 "Read your policy": the check-up rules, read in CODE from the extraction + redacted text.
// The model never decides the limit here, and text that looks like instructions to an AI is skipped.
import type { Extraction } from "../schema.ts";
import { isCheckupPerk } from "../perks.ts";
import type { CheckupRules } from "./types.ts";

export type Evidence = { label: string; quote: string; page: number | null };

/** Lines that address an AI / give orders rather than state policy terms (prompt injection). */
const INJECTION_RE =
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(instructions?|rules?|prompt|above|previous)\b|\b(system prompt|you are (an? )?(ai|assistant|model|chatbot)|as an ai|assistant:|developer mode|jailbreak)\b|\b(tell|say to|instruct)\b[^.\n]{0,20}\b(the )?(user|ai|assistant|model)\b/i;

export const isInjectionLine = (line: string) => INJECTION_RE.test(line);

/** Drops injection-looking lines (keeps page markers), so neither code nor model acts on them. */
export function stripInjection(text: string): string {
  return text
    .split("\n")
    .filter((l) => !isInjectionLine(l))
    .join("\n");
}

/** `own`: the line itself; `text`: joined with the next line so wrapped table rows read whole. */
type Line = { own: string; text: string; page: number | null };

/** The policy as lines with their page, joined with the next line so wrapped table rows read whole. */
function linesOf(text: string): Line[] {
  const out: Line[] = [];
  let page: number | null = null;
  const raw = stripInjection(text).split("\n");
  raw.forEach((l, i) => {
    const m = l.match(/^\[\[PAGE (\d+)\]\]/);
    if (m) {
      page = Number(m[1]);
      return;
    }
    const after = raw.slice(i + 1, i + 3);
    const stop = after.findIndex((x) => /^\[\[PAGE/.test(x));
    const next = (stop === -1 ? after : after.slice(0, stop)).map((x) => ` ${x}`).join("");
    out.push({ own: l.trim(), text: `${l}${next}`.trim(), page });
  });
  return out;
}

const CHECKUP_RE = /health check-?\s?ups?|preventive (health )?check|check-up claims|preventive health/i;

const short = (s: string, n = 150) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function readCheckupRules(e: Extraction, policyText: string): CheckupRules & { evidence: Evidence[] } {
  const perk = e.perks.find(isCheckupPerk) ?? null;
  const lines = linesOf(policyText);
  const checkupLines = lines.filter((l) => CHECKUP_RE.test(l.own));
  // The scope section: lines right after a check-up heading also count (e.g. "Genetic tests are covered only…").
  const scope: Line[] = [];
  lines.forEach((l, i) => {
    if (/check-?up[^.\n]{0,10}scope|scope[^.\n]{0,10}check-?up/i.test(l.own)) scope.push(...lines.slice(i, i + 6));
  });
  // The scope section first: it's the most specific wording.
  const near = [...scope, ...checkupLines];
  const find = (re: RegExp, pool = near) => pool.find((l) => re.test(l.text)) ?? null;
  const evidence: Evidence[] = [];
  /** Quotes the sentence that holds the match, not the whole wrapped row. */
  const cite = (label: string, l: Line | null, re: RegExp) => {
    if (!l) return;
    const m = l.text.match(re);
    const at = m?.index ?? 0;
    // Sentence ends, but not "Rs. 30,000" or "No. 5".
    const ends = [...l.text.matchAll(/(?<!\b(?:Rs|No|Sr|Dr|e\.g|i\.e))\.\s/g)].map((x) => x.index!);
    const from = ends.filter((i) => i < at).pop();
    const to = ends.find((i) => i >= at);
    const sentence = l.text.slice(from === undefined ? 0 : from + 2, to === undefined ? undefined : to + 1).trim();
    evidence.push({ label, quote: short(sentence), page: l.page });
  };

  const limitInr = perk?.capInr ?? 0;
  const LIMIT_RE = /(rs\.?|₹|inr)\s?[\d,]+|% of sum insured/i;
  cite("Limit", find(LIMIT_RE, checkupLines), LIMIT_RE);

  const frequency =
    e.checkupFrequency?.label ||
    (perk?.frequency === "per_year" ? "Once every policy year" : perk?.frequency === "per_policy_term" ? "Once per policy" : "Not stated");

  // Never "cashless" unless the policy says so for the check-up itself.
  const cashlessLine = find(/cashless/i, near.filter((l) => !/not (available )?cashless|no cashless|reimbursement only/i.test(l.text)));
  const reimbLine = find(/reimburs/i);
  const claimRoute: CheckupRules["claimRoute"] = cashlessLine ? "cashless" : reimbLine || perk?.claimMode === "reimbursement" ? "reimbursement" : "ask";
  cite("Claim route", cashlessLine ?? reimbLine, cashlessLine ? /cashless/i : /reimburs/i);

  const withinLine = find(/within\s+\d{1,3}\s+days/i);
  const claimWithinDays = withinLine ? Number(withinLine.text.match(/within\s+(\d{1,3})\s+days/i)![1]) : null;
  cite("Claim deadline", withinLine, /within\s+\d{1,3}\s+days/i);

  const IMAGING_RE = /\b(mri|ct|dexa|imaging|scans?|radiolog)/i;
  const imagingLine = find(IMAGING_RE);
  const imagingAllowed = imagingLine ? !/\b(not covered|excluded|not payable)\b/i.test(imagingLine.text) : null;
  cite("Imaging & advanced screening", imagingLine, IMAGING_RE);

  const GENETIC_RE = /genetic|\bdna\b|genomic/i;
  const geneticLine = find(GENETIC_RE, [...scope, ...lines.filter((l) => /genetic test/i.test(l.own)), ...checkupLines]);
  const geneticRule: CheckupRules["geneticRule"] = !geneticLine
    ? "silent"
    : /prescri/i.test(geneticLine.text)
      ? "prescription"
      : /not covered|excluded/i.test(geneticLine.text)
        ? "excluded"
        : "covered";
  cite("Genetic tests", geneticLine, GENETIC_RE);

  const accreditedLab = !!find(/accredited|nabl|nabh|\bcap\b/i);

  return {
    found: limitInr > 0,
    limitInr,
    limitNote: perk?.capLabel ?? "",
    frequency,
    claimRoute,
    claimWithinDays,
    imagingAllowed,
    geneticRule,
    accreditedLab,
    sourcePage: perk?.sourcePage ?? null,
    evidence,
  };
}

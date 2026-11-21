// Accuracy guard for part B (family / lifestyle items), applied to the model's answer on the server.
// A condition listed as pre-existing is a *waiting period*, not "not covered", and is never
// "permanently excluded" unless the policy text says so for that item.
// Pure (no imports) so the Node test runner can load it.

type Item = {
  id: string;
  emoji: string;
  title: string;
  detail: string;
  status: "covered" | "partly" | "waiting" | "not_covered";
  coveredFrom: string | null | "";
  sourcePage: number;
};

const PED_WORDS = /pre-?\s?existing|\bPED\b|before (?:you )?bu(?:y|ying)|before the policy/i;
const PERMANENT = /permanent(?:ly)?\s+exclu/i;

/** The stated pre-existing waiting period in months, if the policy gives one (e.g. "Pre-existing diseases 36 months"). */
export function pedWaitingMonths(policyText: string): number | null {
  const m = policyText.match(/pre-?\s?existing[^\n]{0,80}?\b(\d{1,2})\s*(?:months?|mths?)\b/i);
  if (m) return Number(m[1]);
  const y = policyText.match(/pre-?\s?existing[^\n]{0,80}?\b(\d)\s*(?:years?|yrs?)\b/i);
  return y ? Number(y[1]) * 12 : null;
}

/**
 * The rest of the line after a "Pre-existing disease" heading: where a schedule lists the member's
 * declared conditions (tables come out of the PDF flattened onto one line). Only that line, so the
 * next rows of a waiting-period table ("Bariatric surgery 36 months") aren't mistaken for PEDs.
 */
function pedSections(policyText: string): string[] {
  const out: string[] = [];
  const re = /pre-?\s?existing\s+(?:disease|diseases|condition|conditions|illness)[^\n]{0,400}/gi;
  for (const m of policyText.matchAll(re)) out.push(m[0]);
  return out;
}

const KEY_WORDS = (title: string) =>
  title
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !["cover", "covered", "care", "treatment", "condition", "conditions", "disease", "diseases", "your", "with", "from", "that", "this"].includes(w));

/** True if the item is about a pre-existing condition (by wording, or because it's listed in a PED table). */
export function isPreExistingItem(item: Pick<Item, "title" | "detail">, policyText: string): boolean {
  if (PED_WORDS.test(`${item.title} ${item.detail}`)) return true;
  const words = KEY_WORDS(item.title);
  if (!words.length) return false;
  return pedSections(policyText).some((s) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(s)));
}

/** Does the policy explicitly state a permanent exclusion *for this item* (not just a table column header)? */
function explicitlyPermanent(item: Pick<Item, "title">, policyText: string): boolean {
  const words = KEY_WORDS(item.title);
  if (!words.length) return false;
  return policyText.split(/\n|(?<=\.)\s/).some((sentence) => {
    if (!PERMANENT.test(sentence)) return false;
    // A table header like "Pre-Existing Disease Permanent Exclusion Loading Reason …" isn't a statement.
    if (/permanent exclusion\s+loading/i.test(sentence)) return false;
    return words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(sentence));
  });
}

export const pedCopy = (months: number | null) =>
  months
    ? `Pre-existing — covered after ${months} months. Check your start date with your insurer.`
    : "Pre-existing — not covered in the first few years. Ask your insurer when cover starts.";

/** Applies the rule to one topic section (family or lifestyle). */
export function fixPreExisting<T extends Item>(items: T[], policyText: string): T[] {
  const months = pedWaitingMonths(policyText);
  return items.map((item) => {
    if (isPreExistingItem(item, policyText) && !explicitlyPermanent(item, policyText)) {
      return { ...item, status: "waiting", detail: pedCopy(months) };
    }
    // Never claim a permanent exclusion the text doesn't state.
    if (PERMANENT.test(item.detail) && !explicitlyPermanent(item, policyText)) {
      const detail = item.detail.replace(/\bpermanent(?:ly)?\s+/i, "").trim();
      return { ...item, detail: detail.charAt(0).toUpperCase() + detail.slice(1) };
    }
    return item;
  });
}

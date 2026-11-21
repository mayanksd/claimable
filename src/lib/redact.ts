// Masks personal data before any text is sent to the model.
// Deliberately simple and visible: the count is shown in the UI.
// Toll-free helplines (1800...) are not personal and must survive.

type Rule = { kind: string; re: RegExp; labelled?: boolean; mask: string };

const RULES: Rule[] = [
  { kind: "Address", re: /(Address)\s*[:\-]?\s*[^\n]{10,160}/g, labelled: true, mask: "[ADDRESS]" },
  { kind: "Name", re: /(Policyholder|Policy holder's name|Proposer|Insured Name)\s*[:\-]?\s*(?:Mr|Mrs|Ms|Dr)?\.?\s*[A-Z][A-Za-z.]+(?: [A-Z][A-Za-z.]+){0,3}/g, labelled: true, mask: "[NAME]" },
  { kind: "Policy number", re: /(Policy No\.?|Policy Number)\s*[:\-]?\s*[A-Z0-9][A-Z0-9\-\/]{5,29}/gi, labelled: true, mask: "[POLICY_NO]" },
  { kind: "PAN", re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, mask: "[PAN]" },
  { kind: "Email", re: /\b[\w.+-]+@(?!aarogya-example)[\w-]+\.[\w.-]+\b/g, mask: "[EMAIL]" },
  { kind: "Phone", re: /(?<![\d+])(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g, mask: "[PHONE]" },
  { kind: "Aadhaar", re: /\b\d{4} \d{4} \d{4}\b/g, mask: "[AADHAAR]" },
  { kind: "Member ID", re: /\b[A-Z]{2,4}-M-\d{5,}\b/g, mask: "[MEMBER_ID]" },
  { kind: "Nominee", re: /\b[A-Z][a-z]+ [A-Z][a-z]+(?= \((?:Mother|Father|Spouse|Wife|Husband|Son|Daughter)\))/g, mask: "[NOMINEE]" },
  { kind: "Date of birth", re: /\b\d{2}\/\d{2}\/(19|20)\d{2}\b(?=\s+\d{2}\s+Self)/g, mask: "[DOB]" },
];

export type Redacted = {
  text: string;
  count: number;
  kinds: string[];
  /** Policyholder's first name, for the greeting. Browser only: never put it in anything sent to the model. */
  firstName: string | null;
};

/** "Mr ROHAN MEHTA" → "Rohan" */
function toFirstName(full: string): string | null {
  const first = full.split(" ")[0].replace(/\./g, "");
  if (!/^[A-Za-z]{2,}$/.test(first)) return null;
  return first[0].toUpperCase() + first.slice(1).toLowerCase();
}

export function redact(input: string): Redacted {
  let text = input;
  let count = 0;
  const kinds = new Set<string>();
  for (const r of RULES) {
    text = text.replace(r.re, (_m: string, label?: string) => {
      count++;
      kinds.add(r.kind);
      return r.labelled && typeof label === "string" ? `${label}: ${r.mask}` : r.mask;
    });
  }
  // Learn the holder's name from the labelled line, then mask it everywhere (tables repeat it unlabelled).
  const holder = input.match(/(?:Policyholder|Policy holder's name|Proposer|Insured Name)\s*[:\-]?\s*(?:Mr|Mrs|Ms|Dr)?\.?\s*([A-Z][A-Za-z.]+(?: [A-Z][A-Za-z.]+){0,3})/);
  if (holder) {
    for (const part of holder[1].split(" ").filter((w) => w.length >= 3)) {
      const re = new RegExp(`\\b${part}\\b`, "gi");
      text = text.replace(re, () => { count++; kinds.add("Name"); return "[NAME]"; });
    }
  }
  return { text, count, kinds: [...kinds], firstName: holder ? toFirstName(holder[1]) : null };
}
// Note: the email rule skips the insurer's own domain so claims/helpline emails survive.
// For a real insurer, replace "aarogya-example" with a list of insurer domains.

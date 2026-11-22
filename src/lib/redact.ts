// Masks personal data before any text is sent to the model.
// Deliberately simple and visible: the count is shown in the UI, so it must not over-count.
// Not personal, so never masked: sums insured, limits and amounts, policy period dates,
// toll-free helplines (1800…), and the insurer's own role mailboxes (claims@, care@…).

type Rule = { kind: string; re: RegExp; labelled?: boolean; mask: string };

/** Words that appear in name fields / table headers but are never someone's name. */
const NOT_A_NAME = new Set(
  (
    "nominee self proposer insured father mother spouse name names policyholder policy holder holders relationship relation " +
    "appointee details detail member members son daughter wife husband brother sister child children age dob gender sex " +
    "address number no id date birth sum plan premium person persons customer client na nil not applicable same as above " +
    "male female mr mrs ms miss dr shri smt kumari the of and or to for in on with by type category sr serial"
  ).split(" "),
);

const TITLE = String.raw`(?:(?:Mr|Mrs|Ms|Miss|Dr|Shri|Smt|Kumari)\.?[ \t]+)?`;
/** Up to 4 capitalised words on the same line (no newlines inside a name). */
const NAME_WORDS = String.raw`([A-Z][A-Za-z.'-]+(?:[ \t]+[A-Z][A-Za-z.'-]+){0,3})`;
/** Only the policyholder / proposer / insured name field. Never nominee, appointee or relationship rows. */
const HOLDER_LABEL = String.raw`(?:Name[ \t]+of[ \t]+(?:the[ \t]+)?(?:Policy[ \t]?holder|Proposer|Insured(?:[ \t]+Person)?)|Policy[ \t]?holder(?:'s)?(?:[ \t]+Name)?|Proposer(?:'s)?(?:[ \t]+Name)?|Insured(?:[ \t]+Person)?(?:'s)?[ \t]+Name)`;
const HOLDER_RE = new RegExp(String.raw`(${HOLDER_LABEL})[ \t]*[:\-–]?[ \t]*${TITLE}${NAME_WORDS}`, "g");

/** Insurer role mailboxes are contact info, not personal data. */
const ROLE_MAILBOX =
  /^(?:care|customer[._-]?care|customercare|claims?|cashless|support|help|helpdesk|info|contact|service|services|grievances?|gro|nodal|cco|wellness|health|tpa|feedback|complaints?|enquir(?:y|ies)|quer(?:y|ies)|policy|renewals?|hello|no-?reply)$/i;

const RULES: Rule[] = [
  // A field label at the start of a line ("Address Flat 302, …" / "Communication Address: …"), not any use of the word.
  {
    kind: "Address",
    // …but not wording sentences like "Address for correspondence is given in the schedule".
    re: /^((?:Communication |Correspondence |Residential |Mailing |Permanent )?Address)\b(?![ \t]+(?:for|of|as|is|in|on|to|given|mentioned|proof|change|details)\b)[ \t]*[:\-]?[ \t]*(?=\S)[^\n]{10,160}/gm,
    labelled: true,
    mask: "[ADDRESS]",
  },
  // The value must contain a digit, so "policy number mentioned in the schedule" stays readable.
  {
    kind: "Policy number",
    re: /(\b[Pp]olicy[ \t]*(?:[Nn]o\.?|[Nn]umber|#))[ \t]*[:\-]?[ \t]*(?=[A-Z0-9/-]*\d)[A-Z0-9][A-Z0-9/-]{5,29}/g,
    labelled: true,
    mask: "[POLICY_NO]",
  },
  { kind: "PAN", re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, mask: "[PAN]" },
  { kind: "Phone", re: /(?<![\d+])(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g, mask: "[PHONE]" },
  { kind: "Aadhaar", re: /\b[2-9]\d{3} \d{4} \d{4}\b/g, mask: "[AADHAAR]" },
  { kind: "Member ID", re: /\b[A-Z]{2,4}-M-\d{5,}\b/g, mask: "[MEMBER_ID]" },
  {
    kind: "Nominee",
    re: /\b[A-Z][a-z]+ [A-Z][a-z]+(?= \((?:Mother|Father|Spouse|Wife|Husband|Son|Daughter)\))/g,
    mask: "[NOMINEE]",
  },
  // A member row: "DD/MM/YYYY <age> [gender] <relationship>" (policy dates aren't followed by an age + relationship).
  {
    kind: "Date of birth",
    re: /\b\d{2}[/-]\d{2}[/-](?:19|20)\d{2}\b(?=[ \t]+\d{1,3}[ \t]+(?:(?:Male|Female|M|F|Other|Transgender)[ \t]+)?(?:Self|Spouse|Wife|Husband|Son|Daughter|Father|Mother)\b)/g,
    mask: "[DOB]",
  },
  { kind: "Date of birth", re: /(\b(?:Date of Birth|DOB|D\.O\.B\.?))[ \t]*[:\-]?[ \t]*\d{2}[/-]\d{2}[/-](?:19|20)\d{2}\b/g, labelled: true, mask: "[DOB]" },
];

export type Redacted = {
  text: string;
  count: number;
  kinds: string[];
  /** Policyholder's first name, for the greeting. Browser only: never put it in anything sent to the model. */
  firstName: string | null;
};

const titleCase = (w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase();

/** Keeps the leading run of real name words: "ROHAN MEHTA Self" → ["ROHAN", "MEHTA"]; "Nominee Relationship" → []. */
export function nameWords(raw: string): string[] {
  const words: string[] = [];
  for (const w of raw.trim().split(/[ \t]+/)) {
    const bare = w.replace(/[.'-]/g, "");
    if (!/^[A-Za-z]{2,}$/.test(bare) || NOT_A_NAME.has(bare.toLowerCase())) break;
    words.push(bare);
  }
  return words;
}

/** The first labelled policyholder name in the text that is really a name, or null. */
export function findHolderName(input: string): string[] | null {
  for (const m of input.matchAll(HOLDER_RE)) {
    const words = nameWords(m[2]);
    if (words.length) return words;
  }
  return null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function redact(input: string): Redacted {
  let text = input;
  let count = 0;
  const kinds = new Set<string>();
  const hit = (kind: string) => {
    count++;
    kinds.add(kind);
  };

  // Labelled holder name, only where the captured words are a real name.
  text = text.replace(HOLDER_RE, (match: string, label: string, raw: string) => {
    if (!nameWords(raw).length) return match;
    hit("Name");
    return `${label}: [NAME]`;
  });

  for (const r of RULES) {
    text = text.replace(r.re, (_m: string, label?: string) => {
      hit(r.kind);
      return r.labelled && typeof label === "string" ? `${label}: ${r.mask}` : r.mask;
    });
  }

  // Personal emails only; insurer role mailboxes (claims@, care@…) and the demo insurer's domain stay.
  text = text.replace(/\b([\w.+-]+)@([\w-]+\.[\w.-]+)\b/g, (m: string, local: string, domain: string) => {
    if (ROLE_MAILBOX.test(local) || /^aarogya-example\./i.test(domain)) return m;
    hit("Email");
    return "[EMAIL]";
  });

  // Learn the holder's name from the labelled line, then mask it everywhere (tables repeat it unlabelled).
  const holder = findHolderName(input);
  if (holder) {
    for (const part of holder.filter((w) => w.length >= 3)) {
      text = text.replace(new RegExp(String.raw`\b${escapeRe(part)}\b`, "gi"), () => {
        hit("Name");
        return "[NAME]";
      });
    }
  }
  return { text, count, kinds: [...kinds], firstName: holder ? titleCase(holder[0]) : null };
}

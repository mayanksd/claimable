// Age and gender for the check-up agent, read from the UNMASKED policy text on the server,
// before redaction. Only the age band and gender ever leave the server; the DOB never does.
// Pure (no imports) so the Node test runner can load it.

export type Gender = "male" | "female" | "unspecified";
export type AgeBand = "under25" | "25to34" | "35to44" | "45plus";
export type Profile = { age: number | null; ageBand: AgeBand | null; gender: Gender };

export const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: "under25", label: "Under 25" },
  { id: "25to34", label: "25–34" },
  { id: "35to44", label: "35–44" },
  { id: "45plus", label: "45+" },
];

export const ageBandOf = (age: number): AgeBand => (age < 25 ? "under25" : age < 35 ? "25to34" : age < 45 ? "35to44" : "45plus");

function ageOn(dob: Date, today: Date): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

const parseDmy = (s: string): Date | null => {
  const m = s.match(/^(\d{2})[/-](\d{2})[/-]((?:19|20)\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return d.getUTCDate() === Number(m[1]) ? d : null;
};

const genderOf = (s: string | undefined): Gender =>
  !s ? "unspecified" : /^(male|m)$/i.test(s) ? "male" : /^(female|f)$/i.test(s) ? "female" : "unspecified";

/** Reads the policyholder's ("Self") DOB and gender from a member row or labelled fields. */
export function readProfile(rawText: string, today: Date): Profile {
  // Member row: "<DOB> <age> [gender] Self"
  const row = rawText.match(
    /\b(\d{2}[/-]\d{2}[/-](?:19|20)\d{2})[ \t]+\d{1,3}[ \t]+(?:(Male|Female|M|F|Other|Transgender)[ \t]+)?Self\b/i,
  );
  const labelledDob = rawText.match(/\b(?:Date of Birth|DOB|D\.O\.B\.?)[ \t]*[:\-]?[ \t]*(\d{2}[/-]\d{2}[/-](?:19|20)\d{2})\b/i);
  const labelledGender = rawText.match(/\b(?:Gender|Sex)[ \t]*[:\-]?[ \t]*(Male|Female|M|F)\b/i);

  const dob = parseDmy(row?.[1] ?? labelledDob?.[1] ?? "");
  const age = dob ? ageOn(dob, today) : null;
  const valid = age !== null && age >= 0 && age < 120 ? age : null;
  return {
    age: valid,
    ageBand: valid === null ? null : ageBandOf(valid),
    gender: genderOf(row?.[2] ?? labelledGender?.[1]),
  };
}

// Step 7: the claim checklist and the "Add reminder" calendar file.
import type { CheckupRules } from "./types.ts";

export function claimChecklist(rules: CheckupRules, hasPrescriptionItem: boolean): string[] {
  const items = [
    rules.claimRoute === "cashless"
      ? "Ask the lab whether they're cashless for your insurer — your policy mentions cashless for the check-up."
      : "Pay at the lab, then claim it back (reimbursement).",
    "Keep the itemised bill and payment receipt.",
    "Keep the test reports (PDF or printed).",
  ];
  if (rules.accreditedLab) items.push("Check the lab is accredited (NABL / NABH / CAP) — it's usually printed on the report.");
  if (hasPrescriptionItem) items.push("For a genetic test: get the doctor's prescription first and attach it to the claim.");
  items.push(
    rules.claimWithinDays
      ? `Submit the claim within ${rules.claimWithinDays} days of the test, as your policy says.`
      : "Submit the claim soon after the test — check the deadline with your insurer.",
  );
  return items;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** When to remind: 30 days before the benefit resets, or in 2 weeks if the reset date isn't known (or is close). */
export function reminderDate(reset: Date | null, today: Date): Date {
  const twoWeeks = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 14));
  if (!reset) return twoWeeks;
  const before = new Date(reset.getTime() - 30 * 86400000);
  return before.getTime() > today.getTime() ? before : new Date(Math.max(today.getTime() + 86400000, reset.getTime() - 3 * 86400000));
}

/** An all-day calendar event (.ics) that works in Google, Apple and Outlook calendars. */
export function reminderIcs(opts: { date: Date; title: string; description: string; now: Date }): string {
  const end = new Date(opts.date.getTime() + 86400000);
  const stamp = opts.now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Claimable//Check-up reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:checkup-${ymd(opts.date)}@claimable`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(opts.date)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(opts.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

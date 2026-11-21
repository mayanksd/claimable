const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2027-01-01 → "1 Jan 2027" (UTC, so the day never shifts with the viewer's timezone). */
export const formatDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/**
 * The next policy anniversary after `today`, when a once-per-policy-year benefit resets.
 * `startDate` is YYYY-MM-DD; returns null if it's missing or invalid.
 */
export function nextPolicyYearStart(startDate: string | null | undefined, today: Date): Date | null {
  const m = startDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  if (mo > 11 || d < 1 || d > 31) return null;
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let year = Math.max(y + 1, today.getUTCFullYear());
  let next = Date.UTC(year, mo, d);
  if (next <= t) next = Date.UTC(++year, mo, d);
  // Policy hasn't started yet: the first reset is a year after it starts.
  return new Date(Math.max(next, Date.UTC(y + 1, mo, d)));
}

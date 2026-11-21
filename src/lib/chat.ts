/** Error codes /api/chat returns as JSON ({ error, code }) before any streaming starts. */
export type ChatErrorCode = "NO_KEY" | "BAD_REQUEST";

export const NO_KEY_MESSAGE =
  "Chat isn't set up on this server yet (ANTHROPIC_API_KEY is missing). Add it in your Vercel project settings.";

/** Keep requests small: the policy text is sent once per request, so trim old turns. */
export const MAX_CHAT_MESSAGES = 12;
export const MAX_QUESTION_CHARS = 500;

/** Starter chips before the first answer; demo/cached-answers.json has an answer for each. */
export const STARTERS = ["Emergency number?", "Tooth extraction covered?", "Free health check-up?"];

export const MAX_CHECKUP_CHIP = "How do I max my check-up?";

// Health check-up, not "dental check-ups" (kept in sync with HEALTH_CHECKUP_RE in perks.ts).
const CHECKUP_RE = /(?<!(dental|eye|vision)\s)check-?\s?ups?\b/i;

/**
 * After any answer about the health check-up, make sure "How do I max my check-up?" is a follow-up
 * (first, keeping at most 3), unless that was the question just asked.
 */
export function withCheckupChip(question: string, answer: string, followups: string[]): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  if (norm(question) === norm(MAX_CHECKUP_CHIP)) return followups;
  if (!CHECKUP_RE.test(question) && !CHECKUP_RE.test(answer)) return followups;
  if (followups.some((f) => norm(f) === norm(MAX_CHECKUP_CHIP))) return followups;
  return [MAX_CHECKUP_CHIP, ...followups].slice(0, 3);
}

/** A follow-up the assistant asks the user (e.g. "Which city is the hospital in?"): fill the input instead of sending. */
export function chipPrefill(chip: string): string | null {
  if (/^which city\b/i.test(chip.trim())) return "The hospital is in ";
  return null;
}

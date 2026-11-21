/** Error codes /api/chat returns as JSON ({ error, code }) before any streaming starts. */
export type ChatErrorCode = "NO_KEY" | "BAD_REQUEST";

export const NO_KEY_MESSAGE =
  "Chat isn't set up on this server yet (ANTHROPIC_API_KEY is missing). Add it in your Vercel project settings.";

/** Keep requests small: the policy text is sent once per request, so trim old turns. */
export const MAX_CHAT_MESSAGES = 12;
export const MAX_QUESTION_CHARS = 500;

/** Starter chips before the first answer; demo/cached-answers.json has an answer for each. */
export const STARTERS = ["Emergency number?", "Tooth extraction covered?", "Free health check-up?"];

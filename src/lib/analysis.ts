import type { Extraction } from "./schema";

export type Redactions = { count: number; kinds: string[] };

export type AnalysisResult = {
  extraction: Extraction;
  redactedText: string;
  redactions: Redactions;
  /** From the policyholder line, for the greeting. Kept in the browser; never sent to the model. */
  firstName?: string | null;
  sample?: boolean;
};

/** Progress events streamed by /api/analyze as newline-delimited JSON. */
export type AnalyzeEvent =
  | { type: "read"; pages: number; screens: number }
  | { type: "masked"; count: number; kinds: string[] }
  | { type: "done"; result: AnalysisResult }
  | { type: "error"; message: string };

const NOT_HEALTH: Record<string, string> = {
  pet: "pet insurance",
  surrogacy: "a surrogacy cover",
  other: "a different kind of document",
};

/** Message for documents that aren't a health policy; null for health policies. */
export function notHealthMessage(documentType: string): string | null {
  const what = NOT_HEALTH[documentType];
  return what ? `This looks like ${what}, not a health policy. Please upload your health policy.` : null;
}

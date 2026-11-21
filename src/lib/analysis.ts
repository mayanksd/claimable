import type { Extraction } from "./schema";

export type Redactions = { count: number; kinds: string[] };

export type AnalysisResult = {
  extraction: Extraction;
  redactedText: string;
  redactions: Redactions;
  /** From the policyholder line, for the greeting. Kept in the browser; never sent to the model. */
  firstName?: string | null;
  sample?: boolean;
  /** Part B (family, lifestyle, watch-out tabs) is still being extracted. */
  pending?: boolean;
  /** Part B couldn't be extracted; those tabs say so. */
  partBFailed?: boolean;
};

/** Progress events streamed by /api/analyze as newline-delimited JSON. */
export type AnalyzeEvent =
  | { type: "read"; pages: number; screens: number }
  | { type: "masked"; count: number; kinds: string[] }
  | { type: "done"; result: AnalysisResult }
  /** After a `done` with pending: the full result, part B failing, or B finding it isn't a health policy. */
  | { type: "update"; extraction?: AnalysisResult["extraction"]; partBFailed?: boolean; notHealth?: string; detail?: string }
  /** `detail` (raw upstream error) is only sent on preview / dev builds. */
  | { type: "error"; message: string; detail?: string };

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

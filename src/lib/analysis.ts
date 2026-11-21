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

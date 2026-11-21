import type { Extraction } from "./schema";
// Relative .ts import so the Node test runner can load this file too.
import { SCANNED_PDF_MESSAGE } from "./limits.ts";

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

/** Friendly one-liners when the upload isn't a health policy. */
const NOT_HEALTH: Record<string, string> = {
  pet: "Cute policy, wrong species 🐶 — try a human health policy?",
  motor: "Vroom vroom — that's car insurance. I fix humans, not bumpers 🚗",
  life: "That's life insurance — I'm all about the living-well perks of health cover 🕊️",
  surrogacy: "Interesting policy! But I'm built for everyday health insurance 🍼",
  other: "Interesting policy! But I'm built for everyday health insurance 🍼",
  not_insurance: "Nice PDF! Not a health policy though 😄 Try again?",
};

/** Message for documents that aren't a health policy; null for health policies. */
export function notHealthMessage(documentType: string): string | null {
  return NOT_HEALTH[documentType] ?? null;
}

/** Wrong-document messages get a friendly card with "Try another PDF" instead of a red error. */
const WRONG_DOCUMENT = new Set([...Object.values(NOT_HEALTH), SCANNED_PDF_MESSAGE]);
export const isWrongDocumentMessage = (message: string | null | undefined) => !!message && WRONG_DOCUMENT.has(message);

import extractionJson from "../../demo/extraction.json";
import cachedAnswersJson from "../../demo/cached-answers.json";
import { ExtractionSchema, type Extraction } from "./schema";

/** Validated against the schema so the demo data and live output share one shape. */
export const demoExtraction: Extraction = ExtractionSchema.parse(extractionJson);

/** Personal fields masked in the demo PDF (see README: tested with lib/redact.ts). */
export const demoRedactions = { count: 15, kinds: ["Name", "PAN", "Phone", "Email", "Address", "Policy number"] };

export const cachedAnswers: Record<string, string> = cachedAnswersJson;

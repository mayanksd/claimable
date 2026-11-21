import extractionJson from "../../demo/extraction.json";
import cachedAnswersJson from "../../demo/cached-answers.json";
import redactedPolicy from "../../demo/redacted-policy.json";
import { ExtractionSchema, type Extraction } from "./schema";

/** Validated against the schema so the demo data and live output share one shape. */
export const demoExtraction: Extraction = ExtractionSchema.parse(extractionJson);

/** Redacted text of demo/aarogya-policy.pdf (regenerate: OUT=demo/redacted-policy.json npm run check:redact). */
export const demoRedactedText: string = redactedPolicy.text;
export const demoRedactions = { count: redactedPolicy.count, kinds: redactedPolicy.kinds };

export const cachedAnswers: Record<string, string> = cachedAnswersJson;

// The fictional sample policies people can try without uploading anything.
// Same insurer and benefits; only the person differs. Regenerate with scripts/make-sample-pdf.py.
import arjunExtraction from "../../demo/extraction-arjun.json";
import priyaExtraction from "../../demo/extraction-priya.json";
import arjunAnswers from "../../demo/cached-answers-arjun.json";
import priyaAnswers from "../../demo/cached-answers-priya.json";
import arjunRedacted from "../../demo/redacted-arjun.json";
import priyaRedacted from "../../demo/redacted-priya.json";
import { ExtractionSchema } from "./schema";
import type { AnalysisResult } from "./analysis";
import type { Profile } from "./profile";

export type SampleId = "arjun" | "priya";

export type Sample = {
  id: SampleId;
  emoji: string;
  /** "Arjun, 27" — the age comes from the masked fixture's profile (worked out from the DOB, which isn't stored). */
  label: string;
  pdfUrl: string;
  result: AnalysisResult;
  cachedAnswers: Record<string, string>;
};

type Fixture = { text: string; count: number; kinds: string[]; firstName: string | null; profile: unknown };

function sample(id: SampleId, emoji: string, extraction: unknown, fixture: Fixture, cachedAnswers: Record<string, string>): Sample {
  const profile = fixture.profile as Profile;
  return {
    id,
    emoji,
    label: `${fixture.firstName}, ${profile.age}`,
    pdfUrl: `/demo/sample-${id}.pdf`,
    cachedAnswers,
    result: {
      extraction: ExtractionSchema.parse(extraction),
      redactedText: fixture.text,
      redactions: { count: fixture.count, kinds: fixture.kinds },
      firstName: fixture.firstName,
      profile,
      sample: true,
    },
  };
}

export const SAMPLES: Record<SampleId, Sample> = {
  arjun: sample("arjun", "👨", arjunExtraction, arjunRedacted, arjunAnswers),
  priya: sample("priya", "👩", priyaExtraction, priyaRedacted, priyaAnswers),
};

export const DEFAULT_SAMPLE: SampleId = "arjun";

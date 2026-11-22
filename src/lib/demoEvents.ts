import type { AnalyzeEvent } from "./analysis";
import { demoExtraction, demoFirstName, demoProfile, demoRedactedText, demoRedactions } from "./demo";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo mode: the sample result after a 2.5 s fake run, with the same progress events as the real pipeline. */
export async function* demoEvents(): AsyncGenerator<AnalyzeEvent> {
  await wait(700);
  yield { type: "read", pages: 4, screens: 1 };
  await wait(700);
  yield { type: "masked", ...demoRedactions };
  await wait(1100);
  yield {
    type: "done",
    result: {
      extraction: demoExtraction,
      redactedText: demoRedactedText,
      redactions: demoRedactions,
      firstName: demoFirstName,
      profile: demoProfile,
      sample: true,
    },
  };
}

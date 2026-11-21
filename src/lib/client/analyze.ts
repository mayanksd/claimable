import { MAX_PDF_BYTES, MAX_PDF_LABEL, pdfTooBigMessage } from "@/lib/limits";
import type { AnalyzeEvent } from "@/lib/analysis";
import { demoEvents } from "@/lib/demoEvents";

/** Runs the analysis and reports each progress event. Demo mode never calls the API. */
export async function runAnalysis(
  input: { policy: File; screens: File[] } | null,
  opts: { demo: boolean },
  onEvent: (e: AnalyzeEvent) => void,
): Promise<void> {
  if (opts.demo || !input) {
    for await (const e of demoEvents()) onEvent(e);
    return;
  }

  const form = new FormData();
  form.append("policy", input.policy);
  for (const s of input.screens) form.append("screens[]", s);

  let res: Response;
  try {
    res = await fetch("/api/analyze", { method: "POST", body: form });
  } catch {
    onEvent({ type: "error", message: "Couldn't reach the server. Check your connection and try again." });
    return;
  }
  if (!res.ok || !res.body) {
    const msg =
      res.status === 413
        ? await res
            .json()
            .then((j: { error?: string }) => j.error)
            .catch(() =>
              input.policy.size > MAX_PDF_BYTES
                ? pdfTooBigMessage(input.policy.size)
                : `That upload is too large. Please keep the PDF under ${MAX_PDF_LABEL}.`,
            )
        : await res
            .json()
            .then((j: { error?: string }) => j.error)
            .catch(() => undefined);
    onEvent({ type: "error", message: msg ?? `Something went wrong (${res.status}). Please try again.` });
    return;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as AnalyzeEvent;
      if (ev.type === "done" || ev.type === "error") finished = true;
      onEvent(ev);
    }
    if (done) break;
  }
  if (!finished) onEvent({ type: "error", message: "The analysis timed out. Please try again." });
}

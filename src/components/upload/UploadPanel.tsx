"use client";

import { useRef, useState } from "react";
import { Check, FileText, Loader2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/analysis";
import { compressImage } from "@/lib/client/compress";
import { runAnalysis } from "@/lib/client/analyze";
import { MAX_PDF_BYTES, MAX_PDF_LABEL, MAX_SCREENS, MAX_UPLOAD_BYTES, fileSize, mb } from "@/lib/limits";
import { cn } from "@/lib/utils";

type StepState = "todo" | "run" | "done";
type Progress = {
  read: { state: StepState; pages?: number; screens?: number };
  masked: { state: StepState; count?: number; kinds?: string[] };
  perks: { state: StepState; perks?: number; flags?: number };
};

const IDLE: Progress = { read: { state: "todo" }, masked: { state: "todo" }, perks: { state: "todo" } };
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
// "Policy number" → "policy number", but keep acronyms like PAN.
const kindLabel = (k: string) => (k === k.toUpperCase() ? k : k.toLowerCase());
const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

export function UploadPanel({ demo, onDone }: { demo: boolean; onDone: (r: AnalysisResult) => void }) {
  const [policy, setPolicy] = useState<File | null>(null);
  const [screens, setScreens] = useState<File[]>([]);
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState<"adding" | "analyzing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<Progress>(IDLE);
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(list: File[], fromSample = false) {
    setError(null);
    setNotice(null);
    setSample(fromSample);
    const pdfs = list.filter(isPdf);
    const imgs = list.filter((f) => f.type.startsWith("image/"));
    const other = list.length - pdfs.length - imgs.length;
    const notes: string[] = [];

    if (pdfs.length) {
      const pdf = pdfs[0];
      if (pdf.size > MAX_PDF_BYTES) {
        setError(
          `“${pdf.name}” is ${mb(pdf.size)}. Please use a PDF under ${MAX_PDF_LABEL}: the policy schedule and benefits pages are enough.`,
        );
      } else setPolicy(pdf);
      if (pdfs.length > 1) notes.push("Only one policy PDF is used at a time.");
    }
    if (imgs.length) {
      setBusy("adding");
      const compressed = await Promise.all(imgs.map((f) => compressImage(f)));
      setBusy(null);
      setScreens((prev) => {
        const next = [...prev, ...compressed];
        if (next.length > MAX_SCREENS) notes.push(`Up to ${MAX_SCREENS} screenshots; extra ones were skipped.`);
        return next.slice(0, MAX_SCREENS);
      });
    }
    if (other) notes.push("Only PDF and image files are supported.");
    if (notes.length) setNotice(notes.join(" "));
  }

  async function loadSample() {
    setError(null);
    try {
      const [pdf, png] = await Promise.all(
        ["/demo/aarogya-policy.pdf", "/demo/rewards-screenshot.png"].map(async (u) => {
          const r = await fetch(u);
          if (!r.ok) throw new Error(u);
          return r.blob();
        }),
      );
      setPolicy(null);
      setScreens([]);
      await addFiles(
        [
          new File([pdf], "aarogya-policy.pdf", { type: "application/pdf" }),
          new File([png], "rewards-screenshot.png", { type: "image/png" }),
        ],
        true,
      );
    } catch {
      setError("Couldn't load the sample policy. Please refresh and try again.");
    }
  }

  async function analyze() {
    if (!policy && !demo) return;
    const total = (policy?.size ?? 0) + screens.reduce((s, f) => s + f.size, 0);
    if (!demo && total > MAX_UPLOAD_BYTES) {
      setError(`Your files add up to ${mb(total)}. Please keep the upload under ${mb(MAX_UPLOAD_BYTES)}, e.g. remove a screenshot.`);
      return;
    }
    setError(null);
    setNotice(null);
    setBusy("analyzing");
    setProgress({ ...IDLE, read: { state: "run" } });

    await runAnalysis(policy ? { policy, screens } : null, { demo }, (e) => {
      switch (e.type) {
        case "read":
          setProgress((p) => ({ ...p, read: { state: "done", pages: e.pages, screens: e.screens }, masked: { state: "run" } }));
          break;
        case "masked":
          setProgress((p) => ({ ...p, masked: { state: "done", count: e.count, kinds: e.kinds }, perks: { state: "run" } }));
          break;
        case "done": {
          const x = e.result.extraction;
          setProgress((p) => ({ ...p, perks: { state: "done", perks: x.perks.length, flags: x.redFlags.length } }));
          setTimeout(() => onDone({ ...e.result, sample: e.result.sample || sample }), 600);
          break;
        }
        case "error":
          setError(e.message);
          setProgress(IDLE);
          setBusy(null);
          break;
      }
    });
  }

  const analyzing = busy === "analyzing";
  const { read, masked, perks } = progress;

  return (
    <div className="mx-auto my-10 max-w-[720px] px-5 text-center sm:my-14">
      <h1 className="mb-3 text-[32px] leading-[1.1] font-extrabold tracking-tight sm:text-[40px]">
        You paid for perks.
        <br />
        <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">Start using them.</span>
      </h1>
      <p className="mb-7 text-[17px] text-muted-foreground">
        Upload your health policy and your insurer app&apos;s rewards screen. See what you&apos;re owed in 20 seconds.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Add your policy PDF and screenshots"
        onClick={() => !analyzing && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !analyzing && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!analyzing) void addFiles([...e.dataTransfer.files]);
        }}
        className={cn(
          "grid cursor-pointer grid-cols-[minmax(0,1fr)] gap-3.5 rounded-[20px] border-2 border-dashed border-brand-line bg-brand-soft p-6 transition-colors sm:p-9",
          drag && "border-brand bg-brand-line/40",
          analyzing && "cursor-default opacity-80",
        )}
      >
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept="application/pdf,.pdf,image/*"
          onChange={(e) => {
            void addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        {policy && (
          <FileRow
            icon={<FileText className="size-5 text-brand" />}
            name={policy.name}
            meta={`PDF · ${fileSize(policy.size)}`}
            onRemove={analyzing ? undefined : () => setPolicy(null)}
          />
        )}
        {screens.map((s, i) => (
          <FileRow
            key={`${s.name}-${i}`}
            icon={<Smartphone className="size-5 text-brand" />}
            name={s.name}
            meta={`image · ${fileSize(s.size)}`}
            onRemove={analyzing ? undefined : () => setScreens((xs) => xs.filter((_, j) => j !== i))}
          />
        ))}
        <div className="text-[13px] text-muted-foreground">
          {busy === "adding" ? (
            "Preparing screenshots…"
          ) : (
            <>
              <b className="text-brand">Drop your policy PDF</b> and up to {MAX_SCREENS} app screenshots here, or click to choose ·
              nothing is stored
            </>
          )}
        </div>
      </div>

      {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-left text-sm font-medium text-bad">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button variant="brand" size="lg" disabled={(!policy && !demo) || !!busy} onClick={analyze}>
          {analyzing ? <Loader2 className="animate-spin" /> : null}
          Find my perks →
        </Button>
        {!analyzing && (
          <Button variant="outline" size="lg" onClick={loadSample} disabled={!!busy}>
            Try with sample policy
          </Button>
        )}
      </div>
      {!policy && !analyzing && (
        <p className="mt-3 text-xs text-muted-foreground">
          The sample is a fictional Aarogya policy. {demo && "Demo mode: no files are sent anywhere."}
        </p>
      )}

      {analyzing && (
        <div className="mx-auto mt-7 grid max-w-[440px] gap-2.5 text-left" aria-live="polite">
          <Step state={read.state}>
            {read.state === "done"
              ? `Read ${plural(read.pages ?? 0, "page")}${read.screens ? ` and ${plural(read.screens, "screenshot")}` : ""}`
              : "Reading your policy…"}
          </Step>
          <Step state={masked.state}>
            {masked.state === "done"
              ? `Masked ${plural(masked.count ?? 0, "personal detail")}${masked.kinds?.length ? ` (${masked.kinds.slice(0, 5).map(kindLabel).join(", ")}…)` : ""}`
              : "Masking personal details"}
          </Step>
          <Step state={perks.state}>
            {perks.state === "done"
              ? `Found ${plural(perks.perks ?? 0, "perk")} and ${plural(perks.flags ?? 0, "red flag")}`
              : "Finding perks, limits and red flags…"}
          </Step>
          <Step state={perks.state === "done" ? "done" : "todo"}>Done</Step>
        </div>
      )}
    </div>
  );
}

function FileRow({ icon, name, meta, onRemove }: { icon: React.ReactNode; name: string; meta: string; onRemove?: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {icon}
      <b className="min-w-0 flex-1 truncate">{name}</b>
      <small className="shrink-0 font-semibold whitespace-nowrap text-good">{meta} ✓</small>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function Step({ state, children }: { state: StepState; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2.5", state === "todo" ? "text-muted-foreground/60" : state === "run" ? "text-muted-foreground" : "text-foreground")}>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full text-xs text-white",
          state === "done" ? "bg-good" : state === "run" ? "bg-brand" : "bg-border",
        )}
      >
        {state === "done" ? <Check className="size-3" strokeWidth={3} /> : state === "run" ? <Loader2 className="size-3 animate-spin" /> : null}
      </span>
      {children}
    </div>
  );
}

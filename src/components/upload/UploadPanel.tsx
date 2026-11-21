"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/analysis";
import { compressImage } from "@/lib/client/compress";
import { runAnalysis } from "@/lib/client/analyze";
import { LIMIT_HINT, MAX_PDF_BYTES, MAX_SCREENS, MAX_UPLOAD_BYTES, fileSize, mb, pdfTooBigMessage } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { ErrorText } from "@/components/ErrorDetail";

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
        setError(pdfTooBigMessage(pdf.size));
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
          setError(e.detail ? `${e.message}\n\nDetails: ${e.detail}` : e.message);
          setProgress(IDLE);
          setBusy(null);
          break;
      }
    });
  }

  const analyzing = busy === "analyzing";
  const { read, masked, perks } = progress;

  return (
    <div className="mx-auto my-8 max-w-[720px] px-5 text-center sm:my-12">
      <AnimatePresence mode="wait" initial={false}>
        {!analyzing ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
            <h1 className="text-[36px] leading-[1.05] font-extrabold tracking-tight sm:text-[48px]">
              You paid for perks.
              <br />
              <span className="bg-gradient-to-r from-brand via-brand-2 to-warm bg-clip-text text-transparent">Start using them.</span>
            </h1>
            <p className="mt-3 text-xl font-medium text-muted-foreground">See what you&apos;re owed in 20 seconds.</p>

            <ul className="mx-auto mt-7 mb-7 grid max-w-[540px] gap-3 text-left text-base sm:text-base">
              <li className="flex items-center gap-3.5">
                <EmojiCircle emoji="🩺" tone="bg-warm-soft" />
                <span>
                  Only <b>1 in 10</b> people use their free health check-up.
                </span>
              </li>
              <li className="flex items-center gap-3.5">
                <EmojiCircle emoji="🔍" tone="bg-brand-soft" />
                <span>Most policies hide OPD, dental, wellness rewards and discounts in the fine print.</span>
              </li>
            </ul>

            <div
              role="button"
              tabIndex={0}
              aria-label="Add your policy PDF and screenshots"
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void addFiles([...e.dataTransfer.files]);
              }}
              className={cn(
                "grid cursor-pointer grid-cols-[minmax(0,1fr)] gap-3 rounded-3xl border-2 border-dashed border-brand-line bg-white/70 p-5 shadow-soft backdrop-blur transition-colors sm:p-7",
                drag && "border-brand bg-brand-soft",
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
              {policy ? (
                <FileRow emoji="📄" name={policy.name} meta={`PDF · ${fileSize(policy.size)}`} onRemove={() => setPolicy(null)} />
              ) : (
                <SlotRow emoji="📄" label="Your policy PDF" hint="required" />
              )}
              {screens.map((sc, i) => (
                <FileRow
                  key={`${sc.name}-${i}`}
                  emoji="📱"
                  name={sc.name}
                  meta={`image · ${fileSize(sc.size)}`}
                  onRemove={() => setScreens((xs) => xs.filter((_, j) => j !== i))}
                />
              ))}
              {screens.length < MAX_SCREENS && (
                <SlotRow
                  emoji="📱"
                  label={
                    screens.length
                      ? "Add another screenshot (optional)"
                      : "Optional: screenshots from your insurance app (home or rewards page)"
                  }
                  hint={`up to ${MAX_SCREENS}`}
                />
              )}
              <div className="text-sm text-muted-foreground">
                {busy === "adding" ? (
                  "Preparing screenshots…"
                ) : (
                  <>
                    <b className="text-brand">Drop files here or click to choose</b> · nothing is stored
                  </>
                )}
                <div className="mt-1 text-xs">{LIMIT_HINT}</div>
              </div>
            </div>

            {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
            {error && (
              <div role="alert" className="mt-4 rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-left text-sm font-medium text-bad">
                <ErrorText text={error} />
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="hero" size="lg" className="h-14 rounded-2xl px-9 text-xl" disabled={(!policy && !demo) || !!busy} onClick={analyze}>
                Find my perks →
              </Button>
              {!policy && !demo && <p className="text-sm font-medium text-muted-foreground">Add your policy first</p>}
              <Button variant="ghost" size="lg" onClick={loadSample} disabled={!!busy}>
                ✨ Try with sample policy
              </Button>
            </div>
            {!policy && (
              <p className="mt-1 text-xs text-muted-foreground">
                The sample is a fictional Aarogya policy. {demo && "Demo mode: no files are sent anywhere."}
              </p>
            )}
            <p className="mx-auto mt-5 max-w-[520px] text-xs text-muted-foreground italic">
              🔒 We mask your name, PAN, phone, email, address and policy number before AI reads anything. Files are never
              stored. Crop names out of screenshots.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="mx-auto mt-6 max-w-[480px] rounded-3xl border border-border/70 bg-white/80 p-6 text-left shadow-soft backdrop-blur sm:p-8"
          >
            <div className="mb-5 flex items-center gap-3.5">
              <EmojiCircle emoji="🔎" tone="bg-brand-soft" />
              <div>
                <h2 className="text-xl font-bold">Reading your policy…</h2>
                <p className="text-sm text-muted-foreground">Hang tight, this takes about 20 seconds.</p>
              </div>
            </div>
            <div className="grid gap-3" aria-live="polite">
              <AnimatePresence initial={false}>
                {read.state !== "todo" && (
                  <Step key="read" state={read.state}>
                    {read.state === "done"
                      ? `Read ${plural(read.pages ?? 0, "page")}${read.screens ? ` and ${plural(read.screens, "screenshot")}` : ""}`
                      : "Reading your policy…"}
                  </Step>
                )}
                {masked.state !== "todo" && (
                  <Step key="masked" state={masked.state}>
                    {masked.state === "done"
                      ? `Masked ${plural(masked.count ?? 0, "personal detail")}${masked.kinds?.length ? ` (${masked.kinds.slice(0, 5).map(kindLabel).join(", ")}…)` : ""}`
                      : "Masking personal details…"}
                  </Step>
                )}
                {perks.state !== "todo" && (
                  <Step key="perks" state={perks.state}>
                    {perks.state === "done"
                      ? `Found ${plural(perks.perks ?? 0, "perk")} and ${plural(perks.flags ?? 0, "red flag")}`
                      : "Finding perks, limits and red flags…"}
                  </Step>
                )}
                {perks.state === "done" && (
                  <Step key="done" state="done">
                    <b>Done! Opening your perks 🎉</b>
                  </Step>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmojiCircle({ emoji, tone }: { emoji: string; tone: string }) {
  return (
    <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-full text-[26px] leading-none", tone)}>
      {emoji}
    </span>
  );
}

function SlotRow({ emoji, label, hint }: { emoji: string; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-line bg-white/70 px-3 py-2.5 text-left text-muted-foreground">
      <EmojiCircle emoji={emoji} tone="bg-brand-soft" />
      <span className="min-w-0 flex-1 text-base font-semibold">{label}</span>
      <small className="hidden shrink-0 text-xs sm:inline">{hint}</small>
    </div>
  );
}

function FileRow({ emoji, name, meta, onRemove }: { emoji: string; name: string; meta: string; onRemove?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 rounded-2xl border border-good-line bg-white px-3 py-2.5 text-left shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <EmojiCircle emoji={emoji} tone="bg-good-soft" />
      <b className="min-w-0 flex-1 truncate">{name}</b>
      <small className="shrink-0 font-semibold whitespace-nowrap text-good">{meta} ✓</small>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="grid shrink-0 place-items-center rounded-full p-1.5 text-muted-foreground hover:bg-secondary max-sm:size-11">
          <X className="size-4" />
        </button>
      )}
    </motion.div>
  );
}

function Step({ state, children }: { state: StepState; children: React.ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center gap-3 text-base", state === "run" ? "text-muted-foreground" : "text-foreground")}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-white transition-colors",
          state === "done" ? "bg-good" : "bg-brand",
        )}
      >
        {state === "done" ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
            <Check className="size-4" strokeWidth={3} />
          </motion.span>
        ) : (
          <Loader2 className="size-4 animate-spin" />
        )}
      </span>
      <span>{children}</span>
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { UploadPanel } from "@/components/upload/UploadPanel";
import type { AnalysisResult } from "@/lib/analysis";
import { ExtractionSchema } from "@/lib/schema";
import { cachedAnswers } from "@/lib/demo";

const KEY = "claimable:last-result";

function loadSaved(): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as AnalysisResult;
    return { ...r, extraction: ExtractionSchema.parse(r.extraction) };
  } catch {
    return null;
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    setResult(loadSaved());
    setReady(true);
  }, []);

  function show(r: AnalysisResult) {
    setResult(r);
    window.scrollTo(0, 0);
    try {
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch {
      /* storage full or blocked: the result still shows */
    }
  }

  function startOver() {
    setResult(null);
    window.scrollTo(0, 0);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  return (
    <>
      <Nav sample={!!result?.sample} onStartOver={result ? startOver : undefined} />
      {!ready ? null : result ? (
        <Dashboard extraction={result.extraction} redactions={result.redactions} cachedAnswers={cachedAnswers} />
      ) : (
        <UploadPanel demo={demo} onDone={show} />
      )}
    </>
  );
}

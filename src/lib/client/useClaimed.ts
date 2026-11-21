"use client";

import { useCallback, useEffect, useState } from "react";

/** Perk ids the user marked "Claimed ✓", remembered per policy in localStorage (best effort). */
export function useClaimed(key: string) {
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setClaimed(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setClaimed(new Set());
    }
  }, [key]);

  const toggle = useCallback(
    (id: string) =>
      setClaimed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* storage blocked: still works for this visit */
        }
        return next;
      }),
    [key],
  );

  return { claimed, toggle };
}

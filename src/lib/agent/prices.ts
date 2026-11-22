// Step 4: live prices from web search are only used if they look right; otherwise the listed price stays.
import { hostOf, type Provider } from "../../data/providers.ts";
import type { PricedProvider } from "./types.ts";

export type LivePrice = { id: string; priceInr: number; url: string };

/** A live price counts only from the provider's own site and within 0.5–1.5× of the listed price. */
export function validLivePrice(p: Provider, live: LivePrice | undefined): boolean {
  if (!live || !Number.isFinite(live.priceInr) || live.priceInr <= 0) return false;
  const host = hostOf(live.url);
  const own = hostOf(p.bookingUrl);
  const base = own.split(".").slice(-2).join(".");
  if (!host || !(host === own || host.endsWith(`.${base}`) || host === base)) return false;
  return live.priceInr >= p.priceInr * 0.5 && live.priceInr <= p.priceInr * 1.5;
}

export function applyLivePrices(providers: Provider[], live: LivePrice[]): PricedProvider[] {
  return providers.map((p) => {
    const l = live.find((x) => x.id === p.id);
    return validLivePrice(p, l)
      ? { ...p, priceInr: Math.round(l!.priceInr), priceSource: "live" as const, liveUrl: l!.url }
      : { ...p, priceSource: p.priceKind === "typical" ? ("typical" as const) : ("listed" as const) };
  });
}

/** Pulls `{id, priceInr, url}` items out of the model's reply (a JSON array, possibly fenced). */
export function parseLivePrices(text: string, ids: string[]): LivePrice[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as unknown[];
    return arr.flatMap((x) => {
      const o = x as Record<string, unknown>;
      const price = typeof o.priceInr === "number" ? o.priceInr : Number(String(o.priceInr ?? "").replace(/[^\d.]/g, ""));
      return typeof o.id === "string" && ids.includes(o.id) && typeof o.url === "string" && price > 0
        ? [{ id: o.id, priceInr: price, url: o.url }]
        : [];
    });
  } catch {
    return [];
  }
}

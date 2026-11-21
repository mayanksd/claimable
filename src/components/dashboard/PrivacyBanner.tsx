import { Lock } from "lucide-react";

/** Quiet reassurance line; deliberately not a coloured banner so the ₹ hero stays the focal point. */
export function PrivacyBanner({ count }: { count: number }) {
  return (
    <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {count} personal {count === 1 ? "detail was" : "details were"} masked before AI read your policy · nothing is stored
    </p>
  );
}

export function PrivacyBanner({ count }: { count: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-good-line bg-good-soft px-3.5 py-2.5 text-sm font-semibold text-good-ink">
      <span aria-hidden>🔒</span>
      {count} personal {count === 1 ? "detail was" : "details were"} masked before AI read your policy. Nothing is stored.
    </div>
  );
}

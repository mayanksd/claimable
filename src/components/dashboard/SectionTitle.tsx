export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <h2 className="mt-6 mb-3 flex items-baseline justify-between gap-3 text-xl font-bold">
      {title}
      {hint && <small className="text-right text-sm font-medium text-muted-foreground">{hint}</small>}
    </h2>
  );
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** ₹10,00,000 → "₹10L", ₹2,50,00,000 → "₹2.5Cr" */
export function inrShort(n: number): string {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)}L`;
  return inr(n);
}

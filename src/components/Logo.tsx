import { useId } from "react";

/** Claimable mark: rounded shield, white tick, small sparkle, filled with the hero gradient. */
export function Logo({ className = "size-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Claimable logo">
      <defs>
        <linearGradient id={`g${id}`} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#d9366a" />
          <stop offset="1" stopColor="#ff7a59" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.6c.5 0 1 .1 1.4.3l8.2 3.1c1 .4 1.6 1.3 1.6 2.3v6.4c0 6.6-4.4 11.8-10.2 14.6-.6.3-1.4.3-2 0C9.2 26.5 4.8 21.3 4.8 14.7V8.3c0-1 .6-1.9 1.6-2.3l8.2-3.1c.4-.2.9-.3 1.4-.3z"
        fill={`url(#g${id})`}
      />
      <path d="M10.6 15.8l3.8 3.8 7-7.6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.2 4.4l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" fill="#fff" />
    </svg>
  );
}

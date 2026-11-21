import type { Metadata } from "next";
// Self-hosted fonts (no Google Fonts request at build or run time).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claimable — See what your health policy owes you",
  description: "Upload your health insurance policy and see the perks you can claim every year.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Soft background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-brand/15 blur-3xl" />
          <div className="absolute top-1/3 -right-40 size-[480px] rounded-full bg-warm/20 blur-3xl" />
          <div className="absolute -bottom-48 left-1/4 size-[520px] rounded-full bg-brand-2/10 blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}

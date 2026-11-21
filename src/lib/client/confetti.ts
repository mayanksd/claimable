"use client";

/** A short celebratory burst. Skipped automatically for prefers-reduced-motion. */
export async function burstConfetti(origin = { x: 0.3, y: 0.3 }) {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#4f46e5", "#7c3aed", "#ff7a59", "#ff4f7b", "#059669", "#fbbf24"];
    const base = { colors, origin, disableForReducedMotion: true, zIndex: 60, scalar: 0.9 };
    confetti({ ...base, particleCount: 80, spread: 70, startVelocity: 38 });
    setTimeout(() => confetti({ ...base, particleCount: 50, spread: 100, startVelocity: 28, decay: 0.92 }), 180);
  } catch {
    /* purely decorative */
  }
}

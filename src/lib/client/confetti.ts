"use client";

// Bumped by stopConfetti so a burst that's still mid-sequence doesn't fire its later waves.
let generation = 0;
let pending: ReturnType<typeof setTimeout> | null = null;

/** A short celebratory burst. Skipped automatically for prefers-reduced-motion. */
export async function burstConfetti(origin = { x: 0.3, y: 0.3 }) {
  const mine = ++generation;
  try {
    const confetti = (await import("canvas-confetti")).default;
    if (mine !== generation) return;
    const colors = ["#4f46e5", "#7c3aed", "#ff7a59", "#ff4f7b", "#059669", "#fbbf24"];
    const base = { colors, origin, disableForReducedMotion: true, zIndex: 60, scalar: 0.9 };
    confetti({ ...base, particleCount: 80, spread: 70, startVelocity: 38 });
    pending = setTimeout(() => {
      pending = null;
      if (mine === generation) confetti({ ...base, particleCount: 50, spread: 100, startVelocity: 28, decay: 0.92 });
    }, 180);
  } catch {
    /* purely decorative */
  }
}

/** Clears confetti still falling or still queued (e.g. the upload turned out not to be a health policy). */
export async function stopConfetti() {
  generation++;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  try {
    (await import("canvas-confetti")).default.reset();
  } catch {
    /* purely decorative */
  }
}

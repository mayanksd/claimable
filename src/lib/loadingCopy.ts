// Loading-screen copy: positive, no time estimates, no apologies.

export type Line = { text: string; emoji: string };

export const HEADLINES: Line[] = [
  { text: "Analyzing your policy…", emoji: "📄" },
  { text: "Masking your personal details", emoji: "🔒" },
  { text: "Firing up my AI brain", emoji: "🧠" },
  { text: "Hunting for hidden perks", emoji: "🕵️" },
  { text: "Counting what you're owed", emoji: "💰" },
  { text: "Almost there — polishing your results", emoji: "✨" },
];

/** After the first pass, these loop for as long as it takes. */
export const LOOP_HEADLINES: Line[] = [
  { text: "Digging into the fine print", emoji: "🔍" },
  { text: "Big policy — lots of perks to find", emoji: "🎁" },
  { text: "Checking every page for you", emoji: "📚" },
];

export const FUN_FACTS = [
  "Only 1 in 10 people use their free health check-up.",
  "Many policies cover dental, OPD and teleconsults.",
  "Some insurers return up to 100% of premium as wellness rewards.",
  "A room-rent cap can cut your whole claim, not just the room.",
];

export const HEADLINE_MS = 5000;
export const FACT_MS = 6000;

/** The headline for the n-th tick: the six in order once, then the loop lines forever. */
export const headlineAt = (n: number): Line =>
  n < HEADLINES.length ? HEADLINES[n] : LOOP_HEADLINES[(n - HEADLINES.length) % LOOP_HEADLINES.length];

export const factAt = (n: number) => FUN_FACTS[n % FUN_FACTS.length];

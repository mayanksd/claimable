import type { Provider } from "../../data/providers.ts";
import type { AgeBand, Gender } from "../profile.ts";

export type FocusId = "heart" | "sugar" | "hormones" | "longevity" | "gut" | "genetic";

export const FOCUS: { id: FocusId; emoji: string; label: string }[] = [
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "sugar", emoji: "🍬", label: "Sugar & metabolism" },
  { id: "hormones", emoji: "⚡", label: "Hormones & thyroid" },
  { id: "longevity", emoji: "⏳", label: "Longevity" },
  { id: "gut", emoji: "🦠", label: "Gut & vitamins" },
  { id: "genetic", emoji: "🧬", label: "Genetic risk (DNA)" },
];

/** `age` only when it came from the policy and wasn't changed (the DOB itself never reaches the browser). */
export type About = { ageBand: AgeBand | null; age?: number | null; gender: Gender; focus: FocusId[] };

export type CheckupRules = {
  /** A usable ₹ limit was found. */
  found: boolean;
  /** The policy mentions a health check-up at all (it may still have no ₹ limit). */
  hasBenefit: boolean;
  limitInr: number;
  limitNote: string;
  frequency: string;
  /** Only "cashless" if the policy text itself says cashless for the check-up. */
  claimRoute: "reimbursement" | "cashless" | "ask";
  claimWithinDays: number | null;
  imagingAllowed: boolean | null;
  geneticRule: "prescription" | "covered" | "excluded" | "silent";
  accreditedLab: boolean;
  sourcePage: number | null;
};

export type Coverage = "covered" | "prescription" | "ask";

export type PricedProvider = Provider & { priceSource: "live" | "listed" | "typical"; liveUrl?: string };
export type CheckedProvider = PricedProvider & { coverage: Coverage; coverageWhy: string };

export type Plan = {
  items: CheckedProvider[];
  totalInr: number;
  limitInr: number;
  score: number;
  duplicateTags: string[];
  /** The focus areas whose pick the plan was built around. */
  focusUsed?: FocusId[];
};

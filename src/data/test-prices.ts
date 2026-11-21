// Approximate prices at large Indian diagnostic labs (walk-in, 2025-26). Edit freely.
// `match` lists words that identify the test in a policy's own list of allowed tests.

export type LabTest = {
  id: string;
  name: string;
  includes: string;
  priceInr: number;
  match: string[];
};

/** The base everyone starts with. */
export const BASE_PACKAGE: LabTest = {
  id: "full-body",
  name: "Full-body package",
  includes: "Blood count, sugar, kidney, liver basics, urine",
  priceInr: 2000,
  match: ["full body", "cbc", "complete blood count", "kidney function", "urine routine"],
};

/** Add-ons people commonly include, in a sensible default order. */
export const ADD_ONS: LabTest[] = [
  { id: "diabetes", name: "Diabetes panel", includes: "HbA1c, fasting insulin", priceInr: 1200, match: ["hba1c", "insulin", "diabetes"] },
  { id: "thyroid", name: "Thyroid profile", includes: "T3, T4, TSH", priceInr: 600, match: ["thyroid", "tsh"] },
  { id: "vitamins", name: "Vitamin D & B12", includes: "25-OH vitamin D, vitamin B12", priceInr: 2000, match: ["vitamin d", "vitamin b12", "b12"] },
  { id: "lipid-liver", name: "Lipid + liver panel", includes: "Cholesterol, triglycerides, LFT", priceInr: 1000, match: ["lipid", "cholesterol", "liver function", "lft"] },
  { id: "heart", name: "Heart check", includes: "ECG + TMT or 2D Echo", priceInr: 2500, match: ["ecg", "tmt", "echo", "cardiac"] },
  { id: "screening", name: "Cancer markers / women's or men's health", includes: "e.g. PSA, CA-125, Pap smear", priceInr: 2500, match: ["psa", "ca-125", "ca 125", "pap smear", "mammogra", "cancer marker"] },
];

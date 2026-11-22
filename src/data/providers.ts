// Bengaluru check-up knowledge bank (listed prices, as of the date below). Edit freely.
// `tags` describe what a package checks, used to fit a plan without paying twice for the same test.
// Nothing here is medical advice: it's what these packages include, as listed by the providers.

export type ProviderCategory = "hero" | "advanced" | "standard" | "genetic" | "test";

export type Provider = {
  id: string;
  name: string;
  product: string;
  covers: string;
  priceInr: number;
  listPriceInr?: number;
  location: string;
  bookingUrl: string;
  category: ProviderCategory;
  asOf: string;
  coverageHint?: string;
  note?: string;
  /** Bookable in Bengaluru. The optimiser only uses providers where this is true. */
  cityConfirmed: boolean;
  /** "typical": a usual walk-in price at accredited labs, not one provider's listed price. */
  priceKind?: "listed" | "typical";
  /** Age-group tests: who they're commonly included for. */
  forBody?: "male" | "female";
  minAge?: number;
  /** e.g. "commonly from 40" — shown when the person is younger than minAge. */
  ageNote?: string;
  tags: string[];
};

export const PRICES_AS_OF = "2026-11-22";

export const PROVIDERS: Provider[] = [
  {
    id: "cent-fullbody",
    name: "Cent Health",
    product: "Full-body screening",
    covers: "MRI, low-dose CT incl. heart calcium score, DEXA, 100+ biomarkers",
    priceInr: 23500,
    listPriceInr: 25000,
    location: "Koramangala",
    bookingUrl: "https://www.cent.health/product",
    category: "hero",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["mri", "ldct", "heart-calcium", "dexa", "blood-basic", "blood-advanced", "thyroid", "vitamins", "metabolic", "liver-kidney"],
  },
  {
    id: "cent-genetic",
    name: "Cent Health",
    product: "Genetic Health Module (add-on, one-time)",
    covers: "Inherited cancer, cardiac and metabolic risk",
    priceInr: 17500,
    location: "Koramangala",
    bookingUrl: "https://www.cent.health/product",
    category: "genetic",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    coverageHint: "covered only with prescription",
    tags: ["dna"],
  },
  {
    id: "nura-ai",
    name: "Nura",
    product: "AI health screening",
    covers: "AI low-dose CT, DEXA, cancer screening and blood tests",
    priceInr: 20000,
    location: "Indiranagar",
    bookingUrl: "https://bengaluru.nura.in/",
    category: "hero",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["ldct", "dexa", "cancer-screen", "blood-basic", "metabolic"],
  },
  {
    id: "uh-basic",
    name: "Ultrahuman Performance Lab",
    product: "Basic",
    covers: "Blood Vision panel, DEXA, bone density, ECG and a doctor consult",
    priceInr: 9999,
    location: "Domlur (Mon–Sat)",
    bookingUrl: "https://www.ultrahuman.com/in/performance-lab/buy/",
    category: "advanced",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["blood-basic", "blood-advanced", "dexa", "ecg", "consult", "metabolic", "thyroid", "vitamins"],
  },
  {
    id: "uh-pro",
    name: "Ultrahuman Performance Lab",
    product: "Pro",
    covers: "Basic + advanced blood, VO2 max, lung function, hearing and eye scan",
    priceInr: 29999,
    location: "Domlur (Mon–Sat)",
    bookingUrl: "https://www.ultrahuman.com/in/performance-lab/buy/",
    category: "hero",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["blood-basic", "blood-advanced", "dexa", "ecg", "consult", "metabolic", "thyroid", "vitamins", "hormones", "vo2", "lung", "hearing", "eye"],
  },
  {
    id: "dh-baseline",
    name: "Deep Holistics",
    product: "Baseline",
    covers: "100+ biomarkers with home sample collection and a doctor consult",
    priceInr: 9999,
    location: "Home collection",
    bookingUrl: "https://deepholistics.com/dh-baseline-landing",
    category: "advanced",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["blood-basic", "blood-advanced", "hormones", "thyroid", "vitamins", "metabolic", "liver-kidney", "consult"],
  },
  {
    id: "supprx-ultra",
    name: "Supp[Rx]",
    product: "Ultra",
    covers: "85+ parameters incl. hormones and advanced cardiac markers",
    priceInr: 5999,
    location: "Home collection",
    bookingUrl: "https://www.supprx.app/pricing",
    category: "advanced",
    asOf: PRICES_AS_OF,
    note: "City availability not confirmed",
    cityConfirmed: false,
    tags: ["blood-basic", "hormones", "thyroid", "heart-blood", "metabolic", "vitamins"],
  },
  {
    id: "tata1mg-gold",
    name: "Tata 1mg",
    product: "Comprehensive Gold Full Body (86 tests)",
    covers: "86 routine tests incl. thyroid, vitamins, liver and kidney",
    priceInr: 2499,
    location: "Home collection",
    bookingUrl: "https://www.1mg.com/labs/test/comprehensive-gold-full-body-checkup-with-smart-report-2763",
    category: "standard",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    tags: ["blood-basic", "thyroid", "vitamins", "metabolic", "liver-kidney"],
  },
];

const ANY_LAB = "https://www.orangehealth.in/lab-test-bangalore";

/**
 * Tests commonly included for an age group / body, booked at any accredited lab.
 * Typical walk-in prices (see src/data/test-prices.ts). Shown as "commonly included for your age group" — not medical advice.
 */
export const AGE_GROUP_TESTS: Provider[] = [
  {
    id: "womens-panel",
    name: "Any accredited lab",
    product: "Women's health panel",
    covers: "Thyroid, iron & ferritin, vitamin D, B12 and hormones (e.g. FSH / LH, prolactin)",
    priceInr: 3000,
    location: "Home collection or any accredited lab",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    forBody: "female",
    minAge: 18,
    tags: ["womens", "hormones", "iron", "thyroid", "vitamins"],
  },
  {
    id: "mens-panel",
    name: "Any accredited lab",
    product: "Men's health panel",
    covers: "Testosterone, lipid profile, HbA1c and liver function",
    priceInr: 2500,
    location: "Home collection or any accredited lab",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    forBody: "male",
    minAge: 18,
    tags: ["mens", "hormones", "heart-blood", "metabolic", "liver-kidney"],
  },
  {
    id: "pap-smear",
    name: "Any accredited lab",
    product: "Pap smear (cervical screening)",
    covers: "Cervical cell check, done at a clinic or diagnostic centre",
    priceInr: 1200,
    location: "Clinic or diagnostic centre",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    forBody: "female",
    minAge: 25,
    ageNote: "commonly from 25",
    tags: ["cervical"],
  },
  {
    id: "mammogram",
    name: "Any accredited diagnostic centre",
    product: "Mammogram",
    covers: "Breast X-ray screening",
    priceInr: 2500,
    location: "Diagnostic centre",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    forBody: "female",
    minAge: 40,
    ageNote: "commonly from 40",
    tags: ["breast", "imaging"],
  },
  {
    id: "psa",
    name: "Any accredited lab",
    product: "PSA (prostate) blood test",
    covers: "Prostate-specific antigen",
    priceInr: 900,
    location: "Home collection or any accredited lab",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    forBody: "male",
    minAge: 50,
    ageNote: "commonly discussed from 50",
    tags: ["psa"],
  },
  {
    id: "colon-fit",
    name: "Any accredited lab",
    product: "Bowel cancer stool test (FIT)",
    covers: "Hidden blood in stool, a common bowel screening",
    priceInr: 800,
    location: "Home kit or any accredited lab",
    bookingUrl: ANY_LAB,
    category: "test",
    asOf: PRICES_AS_OF,
    cityConfirmed: true,
    priceKind: "typical",
    minAge: 45,
    ageNote: "commonly from 45",
    tags: ["colon"],
  },
];

/** Providers in the bank that aren't confirmed for Bengaluru: only listed under "More labs to compare". */
export const UNCONFIRMED = PROVIDERS.filter((p) => !p.cityConfirmed);

/** Labs to compare or book with no fixed price in the bank. */
export const MORE_LABS: { name: string; url: string }[] = [
  { name: "Apollo Diagnostics", url: "https://apollodiagnostics.in/book-a-test/bangalore" },
  { name: "Lal PathLabs", url: "https://www.lalpathlabs.com/test/health-packages/city/bengaluru" },
  { name: "Orange Health", url: "https://www.orangehealth.in/lab-test-bangalore" },
  { name: "Vijaya Diagnostic", url: "https://www.vijayadiagnostic.com/bengaluru" },
  { name: "Aster Labs", url: "https://www.asterlabs.in/bengaluru/tests/sampletype/blood" },
  { name: "Manipal", url: "https://mahi.manipalhospitals.com/bengaluru/health-checkups/" },
];

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

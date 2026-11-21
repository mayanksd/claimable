# Claimable — build brief for Claude Code

Hackathon MVP (Razorpay Rize x AILC "Fix My Itch", 21 Nov). Live demo. Build time on the day: 2–3 hours, so keep it small.

## What it does
1. User uploads a health insurance policy PDF + optional insurer-app screenshots (rewards / step coins).
2. Server extracts PDF text, **redacts personal data**, sends text + images to Claude, gets structured JSON.
3. Dashboard: hero ₹ value of perks vs annual premium, perk cards, step-rewards card, red flags.
4. Chat ("Talk to your policy"): short streamed answers grounded ONLY in the redacted text + extraction JSON, with a page source, a verdict for coverage questions, and 2–3 follow-up chips.

Visual target: `design/mock.html` (open it in a browser; match its layout, spacing, colours and copy).

## Stack (do not change without asking)
- Next.js 15 App Router, TypeScript, `src/` dir
- Tailwind CSS + shadcn/ui (card, button, badge, input, scroll-area, progress, skeleton) + framer-motion + lucide-react
- Vercel AI SDK: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` (`useChat`), `generateObject` with Zod for extraction
- Model: `claude-sonnet-5-5` (change in one constant `MODEL` in `src/lib/ai.ts`)
- PDF text: `unpdf` (server only)
- No database, no auth. Last result kept in React state + localStorage.

## Files provided
- `src/lib/schema.ts` (Zod schema for extraction; moved from `lib/`)
- `src/lib/redact.ts` (moved from `lib/`)
- `prompts/extract.md`, `prompts/chat.md` → system prompts (load as strings)
- `demo/aarogya-policy.pdf`, `demo/rewards-screenshot.png` → FICTIONAL demo inputs
- `demo/extraction.json` → expected output / fallback for demo mode
- `demo/cached-answers.json` → demo answers for the 3 starter chips and every follow-up they lead to

## Routes
- `POST /api/analyze` (multipart: `policy` PDF, `screens[]` images)
  1. `unpdf` → text per page, prefix each page with `[[PAGE n]]`
  2. `redact(text)` → `{ text, count, kinds }`
  3. Two parallel `generateText` calls (thinking `between_tools` + effort `low`, `maxOutputTokens` 8000): **A** = policy, hero, perks, moneyBack, optionalCovers, rewards (gets the screenshots), contacts; **B** = documentType, redFlags, family, lifestyle, ambiguities, checkupFrequency. Each: `buildPartSystem(extractPrompt, part)` → `parseWith(text, PartXSchema)` (fences, outermost `{…}`, trailing-comma repair, defaults, drop broken items) → one retry with the issues if ≥ 45 s of `maxDuration` (120 s) remain. `mergeParts(a, b)` → `normalizeExtraction()`.
     The stream sends `done` as soon as A is back (`pending: true` → Family / Lifestyle / Watch out show skeletons), then `update` with the merged result (or `partBFailed`, or `notHealth` → back to upload). One `[analyze:timing]` JSON log line per request: pdf, redact, model/parse per part, tokens.
     **No structured outputs / strict tools for extraction:** the grammar for this schema is too large for the API to compile. The JSON shape lives in the system prompt (`src/lib/extractionPrompt.ts`).
  4. Return `{ extraction, redactedText, redactions: { count, kinds } }`
- `POST /api/chat` → `streamText` with `system = chatPrompt + "\n\nEXTRACTION JSON:\n" + json + "\n\nPOLICY TEXT:\n" + redactedText`; return `toUIMessageStreamResponse()` (AI SDK v5).
- Demo mode: `?demo=1` or env `DEMO_MODE=1` → `/api/analyze` returns `demo/extraction.json` after a 2.5 s fake delay; chat returns cached answers when the question matches a chip.

## UI components
- `UploadPanel` — dropzone (PDF + images), file chips, "Find my perks" button; progress card with a rotating headline (`src/lib/loadingCopy.ts`, 5 s each, then a loop), the real step ticks, and a rotating "Did you know?" fact (6 s). No time estimates or apologies in loading copy.
- Landing: eyebrow "🩺 Health insurance perk finder", "Your health insurance has perks. / Start using them.", one centred ~640px column; one always-active gradient button ("Upload policy PDF →" opens the picker, then "Find my hidden perks ✨"), drop hint, "+ Add insurance app screenshots (optional)", sample link, privacy line.
- Greeting — "Nice, <first name>! 🎉" (fallback "You're in! 🎉"); the name comes only from the policyholder/proposer/insured field via `redact()` (label words rejected) and goes to the browser only, never to the model.
- Reveal: a fresh result shows ~1.5 s "We found something good! 🎉" with ₹ count-up + light confetti, then fades (300 ms) into the dashboard. Skipped with reduced motion / saved results.
- `HeroValue` — "You're sitting on up to ₹X of perks this year 🎉" + "Limits from your policy. How you claim depends on its terms."; ratio bars vs `policy.annualPremiumInr` (hidden if 0). The total is computed in code (`computeHeroValue`): every `use_now` perk with a ₹ cap `per_year`; per-policy (tenure) limits excluded.
- `PerkGrid` / `PerkCard` — "Use these this week": top 3 `use_now` perks: biggest ₹ first (Easy before Needs a claim on a tie), last slot for the best unlimited/free perk; equal-height cards with a footer row: primary "How do I claim this? →" (asks the chat; the check-up card's primary is "Max my ₹X →"), tag "Easy" / "Needs a claim", small "Mark as used"; page shown as grey "Pg N". "Show all perks (N)" expands the rest grouped by `category`; the "₹X of ₹Y used" meter sits below the cards.
- `CheckupPlanner` — "Max my ₹X →" on the health check-up card: full-body base + add-ons up to the policy limit, running total bar; prices in `src/data/test-prices.ts`; only tests from the policy's list if it has one. No medical advice.
- `MoneyBack` — `moneyBack` items (e.g. "Walk 8,000 steps a day → 10% off renewal") + coin ring / redeem now / next item when a rewards screenshot was given. Hidden if neither.
- Tabs under the hero (chunky pills): "Perks 🎁" (star: hero gradient, "N perks" badge, glow, one shine sweep) | "Planning a family? 👶" (`family`) | "Health glow-up ✨" (`lifestyle`, "Covered from <date>" for waits) | "Watch out ⚠️" (amber "N to know" badge; red only inside). Inactive: white; selected non-Perks: solid indigo. Each tab has its own empty state.
- `WatchOut` — severity colour (high = red, medium = amber), title, why, page; adds a flag when `checkupFrequency.everyYear` is false.
- Extraction extras: `documentType` (non-health → stop with a message; `group_health` → "Employer policy" badge), `isScheduleIncluded` (false → soft banner), `optionalCovers` ("Optional — check your schedule"), `policy.startDate` (check-up reset nudge).
- "Mark as used" toggle per perk + "₹X of ₹Y used" meter (localStorage, per policy).
- Logo: `src/components/Logo.tsx` (shield + tick + sparkle, hero gradient), also `src/app/icon.svg` (favicon).
- `ChatPanel` — "Talk to your policy", sticky right column; 3 starter chips, then the latest answer's follow-ups + "Ask something else"; messages render a verdict pill only if line 1 is exactly COVERED / PARTLY COVERED / NOT COVERED / NOT IN YOUR DOCUMENTS, then the markdown body, then the source line; the `FOLLOWUPS:` line becomes chips.
- Motion (framer-motion, `MotionConfig reducedMotion="user"`): fade/slide upload → progress → dashboard; progress steps tick in one by one; hero count-up 1.2 s + one confetti burst (canvas-confetti) only for a freshly produced result; perk cards stagger in (50 ms); buttons lift on hover; tab underline slides.
- Look: fonts via @fontsource (Bricolage Grotesque headings, Plus Jakarta Sans body; no next/font/google). Indigo base + warm coral accent (`warm` tokens) for wins/CTAs; `hero` button variant is the one primary action per screen (grey when disabled); soft background blobs; rounded-2xl cards with `shadow-soft`. Copy is casual and warm.

## Rules
- Never send unredacted text to the model.
- Every perk and red flag must have `sourcePage`; drop items without it.
- Money in ₹ with Indian grouping (`toLocaleString('en-IN')`).
- No policy-buying advice anywhere.
- Commit after each working step. Run `npm run build` before declaring a step done.

## Build order (one prompt per step)
1. Scaffold: deps, shadcn components, layout + nav, static dashboard from `demo/extraction.json` matching `design/mock.html`.
2. `/api/analyze` real pipeline + UploadPanel with progress steps; demo mode.
3. ChatPanel + `/api/chat` streaming + chips + verdict pill + cached fallback.
4. Polish: motion, empty/error states, mobile layout.
5. Stretch: cached "what reviewers say" card; add-to-calendar for health check-up.

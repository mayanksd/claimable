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
  3. `generateObject({ model, schema: ExtractionSchema, system: extractPrompt, messages: [{ role:'user', content:[{type:'text', text}, ...images as {type:'image', image: base64}] }] })`
  4. Return `{ extraction, redactedText, redactions: { count, kinds } }`
- `POST /api/chat` → `streamText` with `system = chatPrompt + "\n\nEXTRACTION JSON:\n" + json + "\n\nPOLICY TEXT:\n" + redactedText`; return `toUIMessageStreamResponse()` (AI SDK v5).
- Demo mode: `?demo=1` or env `DEMO_MODE=1` → `/api/analyze` returns `demo/extraction.json` after a 2.5 s fake delay; chat returns cached answers when the question matches a chip.

## UI components
- `UploadPanel` — dropzone (PDF + images), file chips, "Find my perks" button, progress steps (Reading → Protected N personal fields → Finding perks → Done).
- `PrivacyBanner` — "🔒 N personal fields were masked before AI read your policy."
- Greeting — "Hi <first name> 👋"; the name comes from `redact()` and goes to the browser only, never to the model.
- `HeroValue` — "You're sitting on ₹X of perks this year 🎉" with count-up; ratio bars vs `policy.annualPremiumInr`; premium 0 (unknown) → "up to ₹X", no ratio.
- `PerkGrid` / `PerkCard` — "Use these this week": top 3 `use_now` perks, easy (cashless / in-app / free) before reimbursement; tag "Easy" / "Needs a claim"; "Show all perks (N)" expands the rest grouped by `category`.
- `MoneyBack` — `moneyBack` items (e.g. "Walk 8,000 steps a day → 10% off renewal") + coin ring / redeem now / next item when a rewards screenshot was given. Hidden if neither.
- `WatchOut` — collapsed by default; severity colour (high = red, medium = amber), title, why, page.
- `ChatPanel` — "Talk to your policy", sticky right column; 3 starter chips, then the latest answer's follow-ups + "Ask something else"; messages render a verdict pill only if line 1 is exactly COVERED / PARTLY COVERED / NOT COVERED / NOT IN YOUR DOCUMENTS, then the markdown body, then the source line; the `FOLLOWUPS:` line becomes chips.
- Motion: cards stagger in (50 ms), hero counter 1.2 s, skeletons while loading.

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

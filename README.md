# Claimable — starter kit

Everything Claude Code needs to build the hackathon MVP. All demo data is FICTIONAL (Aarogya is a made-up insurer). Don't demo with a real policy.

```
CLAUDE.md                  build brief: stack, routes, components, rules, build order
design/mock.html           visual target (open in a browser; 2 screens)
src/lib/schema.ts           Zod extraction schema
src/lib/redact.ts           PII masking (tested on the demo PDF: 15 items masked, helplines kept)
prompts/extract.md         system prompt for extraction
prompts/chat.md            system prompt for "Ask your policy"
demo/aarogya-policy.pdf    4-page fictional policy (perks, red flags, contacts, waiting periods)
demo/rewards-screenshot.png fictional app rewards screen (5,271 coins)
demo/extraction.json       expected extraction = demo-mode fallback
demo/cached-answers.json   fallback answers for the 5 suggested questions
```

## Setup (tonight)
```bash
npx create-next-app@latest claimable --ts --tailwind --app --src-dir --eslint --use-npm
cd claimable
npx shadcn@latest init -d
npx shadcn@latest add card button badge input scroll-area progress skeleton
npm i ai @ai-sdk/anthropic @ai-sdk/react zod unpdf framer-motion lucide-react react-markdown
# copy this kit's folders into the repo root; move lib/* to src/lib/
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
git init && git add -A && git commit -m "scaffold"
```

## Claude Code prompts (one at a time, commit after each)
1. `Read CLAUDE.md and open design/mock.html. Do build step 1: static dashboard rendered from demo/extraction.json, matching the mock. Run npm run build.`
2. `Do build step 2: /api/analyze with unpdf, redact, generateObject; UploadPanel with progress steps; demo mode. Test with demo/aarogya-policy.pdf and demo/rewards-screenshot.png and compare to demo/extraction.json.`
3. `Do build step 3: ChatPanel with useChat, /api/chat streaming, chips, verdict pill, source line, cached fallback from demo/cached-answers.json.`
4. `Do build step 4: polish — count-up hero, staggered cards, skeletons, error states, mobile layout.`

## Demo questions (chips)
- Whom do I call in an emergency?
- Is my hospital cashless?
- I broke my wrist. What is covered?
- I need a tooth extraction. Is it covered?
- When can I use my free health check-up?

## Running it
- `npm run dev`, then open `/` (upload) or `/?demo=1` (demo mode: no API call, sample result after 2.5 s).
- `ANTHROPIC_API_KEY` is read only on the server (set it in Vercel). Without it `/api/analyze` returns a clear error; `DEMO_MODE=1` makes the API serve the sample instead.
- Limits: PDF ≤ 4 MB (shown under the dropzone), up to 3 screenshots (resized in the browser), whole upload < 4.4 MB (Vercel body limit ~4.5 MB). Scanned PDFs with no text are rejected with a hint to use the digital copy.
- Chat: `/api/chat` streams answers grounded in the redacted policy text + extraction JSON. With `?demo=1` the suggested chips answer from `demo/cached-answers.json`; free text uses the API if a key is set, otherwise a friendly demo message.
- `npm run check:redact [-- some.pdf]` extracts a PDF like the API does and prints what was masked. `OUT=demo/redacted-policy.json npm run check:redact` regenerates the demo-mode fixture.

# Claimable — design review (hackathon judge's view)

Method: ran the app with `?demo=1`, screenshotted every screen at 1440×900 and 390×844 (landing, upload in progress, dashboard top, each tab, "Max my check-up", chat mid-conversation) and ran an automated audit on each: distinct font sizes, WCAG AA contrast of text vs its background, tap targets under 44px (phone), horizontal scroll, text blocks above the fold.

## Scores — before

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | First impression (5 s) | 4 | Headline + one coral CTA make the job obvious; "Try with sample policy" is right under it. |
| 2 | Visual hierarchy | 3 | ₹27,000 hero dominates the left, but on desktop the empty chat column (≈400×650px of white) is the biggest element on screen, and a saturated green privacy banner sits above the hero. |
| 3 | Clutter | 3 | 45 text blocks above the fold on the desktop dashboard; greeting + subline + banner + claimed tracker push the first perk card down to y≈680. |
| 4 | Typography | 2 | 10–11 distinct font sizes per dashboard screen (11, 12, 13, 14, 15, 16, 18, 20, 22, 34, 64px); perk titles break as "check-/up". |
| 5 | Colour | 2 | Palette is warm, but muted text is 4.45:1 on the page background (fails AA, ~8 elements per screen); "Easy"/"COVERED" green 3.58:1; reset nudge amber 3.19:1; white on the coral CTA 2.57:1. Green also means "privacy", not only "win". |
| 6 | Spacing & alignment | 3 | Cards share p-5, but grid gaps are 14px (off the 8px rhythm) and the floating "p.2" badge forces a right padding that mis-wraps titles. |
| 7 | Motion & delight | 4 | Smooth view transitions, steps tick in, one confetti burst on a fresh result, cards stagger; reduced-motion respected. |
| 8 | Mobile | 2 | No horizontal scroll, but 15–16 targets under 44px (chips 30px, "Mark claimed" 23px, "Start over" 32px, Ask 36px, close 24px); the chat is ~4 screens down with no way to find it. |
| 9 | Consistency | 3 | Card and Button are shared, but there are four pill styles ("p.2" square outline, 11px extrabold verdict, status pills, chips). |
| | **Total** | **26 / 45** | |

## Top 10 issues (ranked by impact on a judge)

1. **Empty chat dominates the dashboard (desktop).** The right column is mostly blank white with one greeting bubble; the most interactive feature looks unfinished.
2. **Chat is undiscoverable on phones.** It sits below every tab and card (~4 screens down) with no entry point.
3. **Contrast fails AA in many places.** Muted text 4.45:1, green pills 3.58:1, amber nudge 3.19:1, white on coral CTA 2.57:1.
4. **Too many type sizes (10–11 per screen).** Reads as unpolished; no clear scale.
5. **Tap targets under 44px on phone** (chips, "Mark claimed", "Start over", Ask, input, planner close, tabs at 43px).
6. **Competing focal points above the hero.** Saturated green privacy banner + greeting + subline stack above the ₹ hero, and green there means "privacy", diluting "green = win".
7. **Perk card header.** Absolutely-positioned "p.2" badge forces awkward title wraps ("check-/up") and floats off the grid.
8. **Weak brand mark.** The nav logo is a plain purple square.
9. **Claimed tracker sits between the tabs and the top perks**, pushing the cards below the fold on a 900px-tall laptop.
10. **Section hints add noise** ("biggest value first", "from your policy and app screenshot") at low contrast and a 13px size.

Fixing 1–7 below.

## Fixes made (1–7), each re-screenshotted and re-audited

| # | Issue | Fix | Confirmed by |
|---|---|---|---|
| 1 | Empty chat column | Welcome card in the empty area: 💬 icon, "Ask your policy anything", one line of context and the 3 starters as large buttons. The bottom chip bar only appears once there are follow-ups. | Desktop dashboard: the right column now reads as an invitation, not blank space. |
| 2 | Chat undiscoverable on phones | Floating "💬 Talk to your policy" button (48px, phones/tablets only) scrolls to the chat and hides once the chat is on screen; extra bottom padding so it never covers content. | Phone: visible on load, tap scrolls the chat into view and the button disappears; not shown at 1440px. |
| 3 | Contrast | Tokens: muted text #526075 (5.98:1), green #047857 (5.21:1 on mint), amber #b45309 (4.84:1), red #b91c1c (5.91:1); CTA gradient #e4572e→#d9366a (white text 3.7–4.5:1, large bold text). Footer no longer uses 80% alpha. | Audit: 0 contrast failures on all 18 screens (was 2–11 per screen). |
| 4 | Type scale | One scale: 12 / 14 / 16 / 20px for UI text + display sizes for the headline and ₹ hero. | Audit: 4 text sizes + 2 display sizes per screen (was up to 11). |
| 5 | Tap targets | On phones, buttons, inputs, chips, "Mark claimed", tabs, planner close and file-remove buttons are at least 44px. | Audit: 0 targets under 44px on all phone screens (was 10–16). |
| 6 | Competing focal points | Privacy notice is now a quiet muted line with a lock icon instead of a green banner; green is reserved for wins and coverage. | Dashboard: the ₹ hero is the only saturated block above the fold. |
| 7 | Perk card header | Emoji and "p.N" share a header row; titles get the full width (`text-balance`). All pills (page refs, Easy / Needs a claim, statuses, verdicts) share one rounded-full 12px bold style. | "Free annual health check-up" fits on one line; no floating badge. |

## Scores — after

| # | Criterion | Before | After | Evidence |
|---|---|---|---|---|
| 1 | First impression (5 s) | 4 | 4 | Landing unchanged apart from a higher-contrast CTA; still one obvious action. |
| 2 | Visual hierarchy | 3 | 4 | The hero is the only saturated block; the chat column now has a centred purpose. |
| 3 | Clutter | 3 | 3 | Text blocks above the fold are about the same (46); the claimed tracker still sits above the perks (issue 9). |
| 4 | Typography | 2 | 4 | 4 text sizes + 2 display sizes; no mid-word title breaks. |
| 5 | Colour | 2 | 4 | 0 AA failures; green = win/coverage, amber/red = watch out. |
| 6 | Spacing & alignment | 3 | 3 | Card headers aligned; grid gaps are still 14px rather than an 8px multiple. |
| 7 | Motion & delight | 4 | 4 | Unchanged (transitions, ticking steps, confetti once, stagger, reduced-motion respected). |
| 8 | Mobile | 2 | 4 | 0 targets under 44px, a floating button to reach the chat, no horizontal scroll. |
| 9 | Consistency | 3 | 4 | One pill style, one button system, one chip style. |
| | **Total** | **26 / 45** | **34 / 45** | |

Not fixed (8–10): brand mark, claimed tracker placement, section hints.

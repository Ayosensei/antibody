# DESIGN.md — Antibody design system, UX flows and screen specifications

Status tags: `DECIDED` (fixed by Ayo or by this document, do not change without Ayo's approval), `ASSUMED` (our choice with a reason), `UNVERIFIED` (not confirmed; ask before relying on it).

**This file is the single source of truth for every visual and interaction decision.** A coding agent must not guess. If something is not specified here, stop and ask Ayo; then add the answer to this file. Data shapes come from `DATA_CONTRACTS.md`. The CSS in `app/styles/tokens.css` and `app/styles/metal.css` implements the tables in section 3; if CSS and this file disagree, **this file wins** and the CSS is fixed.

---

## 0. How to use this document

1. Read sections 1 to 4 once (intent, foundations, primitives, components).
2. Build with the levels in section 14: **L1 is mandatory**, L2 and L3 are cut-list items.
3. For each screen, build exactly what its section in 8 specifies: layout, content, states, copy, interactions.
4. Use only the copy in section 11 and in the screen specs. Do not rewrite copy.
5. Run the acceptance checklist in section 15 before opening a PR.
6. **No invented data.** Every number, id, status and sentence shown comes from the API (`Report`, `TraceLine`, `/health`, `/memory`) or from the copy deck. See section 14.4 for the one permitted fixture use.

Decisions that need an API or contract change are listed in section 16 and have been applied to `DATA_CONTRACTS.md` section 11.

---

## 1. Design intent

### 1.1 Subject, audience, job

- **Product:** Antibody attacks a sandbox copy of an AI automation, fixes what breaks, proves the fix, remembers it, and explains every decision with evidence you can check.
- **Audience:** (1) hackathon judges who will click around for a few minutes and may type their own attack; (2) freelancers and small-team builders who want to know whether an automation is safe to launch.
- **Primary job of the UI:** make the loop visible and believable. A viewer should see what was attacked, what broke, what was fixed, why the fix was accepted or rejected, and what evidence supports each claim.

### 1.2 Look and feel (`DECIDED` by Ayo): metallic

Ayo asked for a **metallic look** similar to OpenCircle's leaderboard (`opencircle.cc`) and Meterless (`meterless.ai`). What we take from those references, observed from the screenshots Ayo supplied:

| From | We borrow |
|---|---|
| OpenCircle | Near-black page with a soft pale light falling from the top; very large, light-weight two-line headline whose second line is dimmer; **podium blocks and avatars with real metal gradients (gold, silver, bronze)**; dark rounded rows with subtle alternating tint; pill-shaped tab groups and buttons with a bright chrome hairline; a floating glass pill nav; small muted column headers |
| Meterless | Deep near-black with a cool-purple cast; one lime accent used for the primary action and for "good" states; light display headline with the last line in lime; thin hairline panels; small monospaced technical details; generous vertical space between sections |

What we **do not** copy: logos, imagery, exact fonts, exact wording, avatar-style leaderboard layouts, the podium itself. The metallic language is ours (section 3.3).

### 1.3 The one memorable thing

Spend boldness in **one place**: the **readiness medal plate** (section 8.3) and the **two-tone metal headline** on the launcher. Everything else is quiet: dark graphite surfaces, chrome hairlines, small type. No other element may use the full metal gradients (gold, silver, bronze) except: the stage tracker's completed discs (silver) and the target-card icon discs (silver).

### 1.4 Design plan and self-review

Plan (palette, type, layout, principles) is in sections 3, 4 and 8. Review against common generic defaults, with what we changed:

| Generic default | Our decision |
|---|---|
| Tracked-out ALL-CAPS eyebrow above every heading | **Not used.** Section headings are sentence case. The only small-caps-like text is none; mono is reserved for ids, refs, timestamps, numbers |
| Identical rounded cards everywhere with the same soft shadow | **Four surface types with different radii and roles** (section 3.3): plate, row, inlay, field. Cards are used only for target choice and metrics |
| Middle-dot meta strings ("A · B · C") | **Not used.** Meta items are separate chips or separate labeled fields |
| Arrow glyph appended to buttons and links | **Not used** on buttons. A chevron icon appears only on expandable rows |
| Numbered markers | Used **only** for the six-stage tracker, which is a real sequence |
| Near-black plus one bright accent | **Pinned by the brief** (Meterless reference). Lime is the only chromatic accent for "good/primary"; ember, amber and ice-blue are semantic and used only for status |
| Motion on every section | **One orchestrated moment** on first load of the launcher (section 3.9). Everything else moves only in response to a user action or to show a live run |

### 1.5 Principles

1. **Evidence on tap.** Any claim can be traced to a chip that opens its source snippet.
2. **Honest states.** Fallbacks, replays, unverified explanations and unresolved attacks are always visible, never hidden or softened.
3. **Metal is a signal.** Bright metal marks the verdict and completed progress, not decoration.
4. **Text is never the only cue, color is never the only cue.** Every status has a word and an icon.
5. **Plain language.** Names a builder understands ("Leaked the secret key"), not internal codes. Codes appear secondarily in mono.
6. **One primary action per screen** (lime).

---

## 2. Information architecture and navigation

### 2.1 Sitemap and routes (`DECIDED`)

| Route | Screen | Purpose | In MVP |
|---|---|---|---|
| `/` | S1 Launcher | Start a run; see recent runs | yes |
| `/runs/[traceId]` | S2 Run view (live trace, then S2b Report) | Watch the loop; read the report | yes |
| `/memory` | S3 Fix library | See what Antibody remembers; reset | yes (light) |
| `/compare` | S4 Cold vs warm | Comparison from saved JSON | cut-list item 6 |
| `/dev/gallery` | Component gallery | Development only (section 14.4) | dev only |
| any other path | S5 Not found | Help the person get back | yes |

Deep links: a run URL is shareable on the same machine; it loads the report from `GET /runs/{traceId}` (section 9).

### 2.2 Global navigation (the glass pill)

- Position: fixed, 16px from the top, horizontally centered; z-index `--ab-z-nav`.
- Content, left to right inside one pill: wordmark "Antibody" (links to `/`), then links **Run** (`/`), **Fix library** (`/memory`), **Cold vs warm** (`/compare`). Current page link has the selected style (section 4.2).
- No theme toggle (dark only, `DECIDED`), no user menu, no search.
- Mobile (< 640px): same pill with the wordmark hidden; links are text only (14px), the pill spans the viewport width minus 24px, and the links are spaced evenly.
- Page content starts 96px from the top (so nothing sits under the pill).
- The `Cold vs warm` link is hidden if S4 is cut.

### 2.3 Page titles and landmarks

| Route | `<title>` |
|---|---|
| `/` | `Antibody` |
| `/runs/[traceId]` | `Run: <automation name> | Antibody` while running; `Report: <automation name> | Antibody` when finished |
| `/memory` | `Fix library | Antibody` |
| `/compare` | `Cold vs warm | Antibody` |
| not found | `Page not found | Antibody` |

Landmarks: `header` (nav), `main` (one per page, `id="main"`), `footer`. A "Skip to content" link is the first focusable element (visible on focus).

### 2.4 Client-side storage (`DECIDED`)

`localStorage` key `antibody.recent_runs`: array (max 10, newest first) of `{ "trace_id": string, "target_id": string, "started_at": ISO string }`. Written when a run starts. Read by S1 to show recent runs. If storage is unavailable, S1 shows the empty state. No other client storage.

---

## 3. Foundations (tokens)

All values are implemented as CSS custom properties with the `--ab-` prefix in `app/styles/tokens.css`.

### 3.1 Color

**Surfaces and lines**

| Token | Value | Use |
|---|---|---|
| `--ab-bg` | `#07080B` | Page background |
| `--ab-s1` | `#0C0E13` | Rows, metric cards, table body |
| `--ab-s2` | `#12151C` | Plates' inner fill, inlays, expanded panels, fields |
| `--ab-s3` | `#191D27` | Hover and selected fills, segmented selected |
| `--ab-line` | `rgba(255,255,255,0.08)` | Default 1px hairlines |
| `--ab-line-strong` | `rgba(255,255,255,0.16)` | Hairlines on hover, dividers inside plates |
| `--ab-glass` | `rgba(14,16,21,0.72)` | Nav pill fill (with blur) |

**Text**

| Token | Value | Min size | Contrast on `--ab-s1` |
|---|---|---|---|
| `--ab-text` | `#F2F4F8` | any | 16.5:1 |
| `--ab-text-2` | `#B4BAC6` | any | 9.4:1 |
| `--ab-text-3` | `#7F8798` | 13px and up | 5.0:1 |
| `--ab-text-on-lime` | `#0B1203` | any | on lime 14:1 |

Never use a color lighter than `--ab-text-3` darkness for text. Placeholder text uses `--ab-text-3`.

**Accent and status (semantic; each always paired with an icon and a word)**

| Token | Value | Meaning | Tint (backgrounds) |
|---|---|---|---|
| `--ab-lime` | `#C6F36A` | Primary action; good: verified, blocked, accepted, ready | `rgba(198,243,106,0.12)` |
| `--ab-ember` | `#FF7A59` | Bad: hit, rejected, failed, unresolved, not ready | `rgba(255,122,89,0.12)` |
| `--ab-amber` | `#F2C14E` | Caution: fallback, needs revision, unverified, ready with risks | `rgba(242,193,78,0.12)` |
| `--ab-ice` | `#7FB2FF` | Info: retrying, replayed, running | `rgba(127,178,255,0.12)` |
| `--ab-focus` | `#9CC4FF` | Keyboard focus ring | n/a |

**Agent hues** (a 6px dot beside the agent name; the name is always written)

| Agent | Token | Value |
|---|---|---|
| Attacker | `--ab-agent-attacker` | `#E08A63` |
| Judge | `--ab-agent-judge` | `#C9CED8` |
| Diagnoser | `--ab-agent-diagnoser` | `#7FB2FF` |
| Memory | `--ab-agent-memory` | `#A99BFF` |
| Fixer | `--ab-agent-fixer` | `#C6F36A` |
| Verifier | `--ab-agent-verifier` | `#EBC862` |
| System | `--ab-agent-system` | `#7F8798` |

### 3.2 Metals (gradients)

| Token | Value |
|---|---|
| `--ab-silver` | `linear-gradient(145deg,#F7F9FC 0%,#CDD3DD 22%,#8D95A4 48%,#E3E7EE 68%,#9AA2B1 100%)` |
| `--ab-gold` | `linear-gradient(145deg,#FFF1BF 0%,#EBC862 24%,#B58A2A 52%,#F6DC8C 74%,#C49A3C 100%)` |
| `--ab-bronze` | `linear-gradient(145deg,#F6D2B3 0%,#D09566 26%,#8E5B3A 54%,#E2AE86 78%,#9C6844 100%)` |
| `--ab-gunmetal` | `linear-gradient(145deg,#3B4252 0%,#1B1F29 40%,#0F1218 70%,#2A3040 100%)` |
| `--ab-chrome-edge` | `linear-gradient(150deg,#F5F7FA 0%,#7A8294 30%,#1A1E27 55%,#A9B0BE 80%,#E9ECF2 100%)` (the bright hairline around plates and pills) |
| `--ab-metal-text` | `linear-gradient(180deg,#FFFFFF 0%,#C4CAD6 52%,#7C8496 100%)` (headline fill) |
| `--ab-metal-text-dim` | `linear-gradient(180deg,#9AA1B0 0%,#6D7485 100%)` (second headline line) |
| `--ab-sheen` | `linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.28) 50%,transparent 62%)` (moving highlight) |
| `--ab-page-light` | `radial-gradient(1200px 600px at 50% -10%,rgba(180,190,210,0.16),transparent 60%)` (light from above on `body`) |

**Contrast rule for metal:** text is never placed directly on a bright metal gradient. Metal appears as a rim, a disc or a thin band; text sits on a dark inlay (`--ab-s2`).

### 3.3 Surface types (the four, each with its own radius and job)

| Surface | Class | Radius | Fill | Border | Shadow | Used for |
|---|---|---|---|---|---|---|
| **Plate** | `ab-plate` | 28px (`--ab-r-plate`) | `--ab-s1` | 1px **chrome edge** gradient | plate shadow (3.6) | Launch console, readiness plate, stage tracker, trace panel, progress panel |
| **Row** | `ab-row` | 18px (`--ab-r-row`) | `--ab-s1`, even rows `rgba(255,255,255,0.025)` overlay | 1px `--ab-line` | none | Findings, trace rows, recent runs, memory rows, recent items |
| **Inlay** | `ab-inlay` | 14px (`--ab-r-inlay`) | `--ab-s2` | 1px `--ab-line` | inset `0 1px 0 rgba(0,0,0,.5)` | Expanded panels, code blocks, snippets, explanation panel |
| **Field** | `ab-field` | 14px | `--ab-s2` | 1px `--ab-line-strong` | inset `0 1px 2px rgba(0,0,0,.5)` | Inputs, selects, textareas |

Pills (`999px`) are used for the nav, buttons, chips, segmented controls and badges only. A metric card is a row-type surface with radius 20px (`--ab-r-card`).

### 3.4 Typography

Fonts (`ASSUMED`; `UNVERIFIED` that they load offline, so every stack has a system fallback and the app must still look acceptable with fallbacks):

| Role | Family | Fallback stack | Weights |
|---|---|---|---|
| Display | **Outfit** | `"Segoe UI", system-ui, sans-serif` | 200, 300, 500 |
| Text and UI | **Hanken Grotesk** | `system-ui, -apple-system, "Segoe UI", sans-serif` | 400, 500, 600 |
| Mono (ids, refs, times, numbers in tables, code) | **JetBrains Mono** | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | 400, 500 |

Load with `next/font` (self-hosted at build) if available; otherwise Google Fonts `<link>` in `app/layout.tsx` with `display=swap`. If neither works, rely on fallbacks; do not block rendering.

**Type scale** (px / line-height / weight / letter-spacing; fluid sizes use `clamp`):

| Token | Size | Line | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|---|
| `--ab-t-display-xl` | `clamp(40px, 7vw, 76px)` | 1.02 | 300 | -0.035em | Display | Launcher headline |
| `--ab-t-display-l` | `clamp(30px, 4.5vw, 44px)` | 1.08 | 300 | -0.03em | Display | Readiness title, page titles |
| `--ab-t-h1` | 32px | 1.15 | 400 | -0.02em | Display | Page H1 on S2, S3, S4 |
| `--ab-t-h2` | 24px | 1.25 | 500 | -0.015em | Display | Section headings in the report |
| `--ab-t-h3` | 18px | 1.3 | 600 | -0.005em | Text | Panel headings, card titles |
| `--ab-t-body-l` | 18px | 1.6 | 400 | 0 | Text | Hero sub text, readiness summary |
| `--ab-t-body` | 16px | 1.6 | 400 | 0 | Text | Default body |
| `--ab-t-small` | 14px | 1.5 | 400 | 0 | Text | Helper text, table cells, chips |
| `--ab-t-caption` | 13px | 1.4 | 500 | 0.01em | Text | Table column headers, tiny labels (sentence case) |
| `--ab-t-mono` | 13px | 1.5 | 400 | 0 | Mono | Ids, refs, action names, timestamps |
| `--ab-t-mono-s` | 12.5px | 1.5 | 400 | 0 | Mono | Raw JSON, snippets |
| `--ab-t-num-xl` | 48px | 1.0 | 300 | -0.02em | Display, `font-variant-numeric: tabular-nums` | Metric numbers |

Rules: body text line length at most 70 characters (`max-width: 70ch` on paragraphs). Sentence case everywhere. No ALL CAPS anywhere. Mono is never used for sentences. Numbers in tables use tabular figures.

**Headline treatment (launcher only):** two lines. Line 1 uses `--ab-metal-text` fill, line 2 uses `--ab-metal-text-dim`. This is a two-line statement, not a single accented word.

### 3.5 Spacing

4px base. Tokens `--ab-sp-1` to `--ab-sp-12`: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 128. Vertical rhythm: between page sections 56px (md+) or 40px (sm); inside plates 24px between groups; between a label and its control 8px; between rows 8px.

### 3.6 Radii

`--ab-r-pill` 999px; `--ab-r-plate` 28px; `--ab-r-card` 20px; `--ab-r-row` 18px; `--ab-r-inlay` 14px; `--ab-r-field` 14px; `--ab-r-chip-sq` 8px (code tags only).

### 3.7 Elevation and shadows

| Token | Value | Use |
|---|---|---|
| `--ab-shadow-plate` | `inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), 0 18px 48px rgba(0,0,0,0.55)` | Plates |
| `--ab-shadow-pill` | `inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 24px rgba(0,0,0,0.5)` | Nav pill, secondary buttons |
| `--ab-shadow-lime` | `0 0 0 1px rgba(198,243,106,0.5), 0 8px 28px rgba(198,243,106,0.22)` | Primary button |
| `--ab-shadow-float` | `0 24px 64px rgba(0,0,0,0.65)` | Dialog, toast |

Rows, fields and inlays have no outer shadow.

### 3.8 Texture

Plates and the page body carry a very faint **brushed-grain noise**: an inline SVG `feTurbulence` image at 4% opacity with `mix-blend-mode: overlay` on a `::after` layer, `pointer-events: none`. Spec is in `metal.css`. L2 level (section 14). If it harms text legibility or performance, remove it; nothing depends on it.

### 3.9 Motion

| Token | Value |
|---|---|
| `--ab-dur-1` | 120ms (press, hover color) |
| `--ab-dur-2` | 200ms (expand, collapse, chip open) |
| `--ab-dur-3` | 320ms (dialog, toast) |
| `--ab-dur-sheen` | 900ms |
| `--ab-ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

Rules (`DECIDED`):

1. **One orchestrated moment:** on first load of `/` only, the headline's metal gradient does one sheen sweep (900ms, left to right) after 200ms delay, and the launch console fades from 0 to 1 opacity over 320ms. It plays once per page load, never again.
2. **Responses to the person's actions** may animate (expand and collapse height with `--ab-dur-2`, evidence chip snippet reveal, button press, button sheen on hover or focus, dialog and toast in and out).
3. **Live-run indicator:** a 2px scan line (`ab-scan`) travels along the top edge of the trace plate while the run is running (2.4s linear loop). It stops when the run ends.
4. No scroll-triggered animations. No entrance animation on any other page or section. No parallax.
5. `prefers-reduced-motion: reduce`: disable the sheen sweeps, the scan line animation (show a static 2px line in `--ab-ice`), and fades; expand and collapse become instant.

### 3.10 Icons

Inline SVG components in `app/components/icons.tsx`, 16x16 viewBox, `fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round`. Sizes: 16px inline, 20px in buttons and chips, 24px in medals. **No icon library dependency.** Required set and meaning (shapes are reference; keep meaning and visual weight):

| Name | Shape | Used for |
|---|---|---|
| `check` | tick | success, verified, accepted, done stage |
| `x` | cross | rejected, remove |
| `alert` | triangle with exclamation | caution, unverified, fallback |
| `retry` | circular arrow | retrying |
| `edit` | pencil | needs revision |
| `escalate` | arrow up | escalated |
| `blocked` | circle with diagonal slash | blocked out of scope |
| `fail` | circle with exclamation | failed |
| `chevron` | chevron pointing down (rotate for open) | expand |
| `copy` | two overlapping squares | copy |
| `download` | arrow down into tray | download |
| `evidence` | small document with a check | evidence chip prefix |
| `shield` | shield | readiness (silver medal uses `alert`; gold `check`; bronze `x`), memory header |
| `loop` | two arrows in a loop | loop indicator |

Reference path data (16x16, may be refined for balance): `check` `M3 8.5l3.2 3.2L13 4.8`; `x` `M4 4l8 8M12 4l-8 8`; `alert` `M8 2.2L14.2 13H1.8L8 2.2zM8 6.6v3M8 11.3v.1`; `chevron` `M3.5 6l4.5 4.5L12.5 6`; `copy` `M5.5 5.5h7v8h-7zM3.5 10.5v-8h7`; `download` `M8 2.5v7.5M4.8 7.2L8 10.4l3.2-3.2M3 13h10`; `escalate` `M8 13V3.5M4.5 7L8 3.5 11.5 7`; `retry` `M13 8a5 5 0 1 1-1.5-3.6M13 2.8v2.6h-2.6`; `edit` `M3 13l.6-2.8L10.8 3l2.2 2.2-7.2 7.2zM9.6 4.2l2.2 2.2`; `blocked` `M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM3.8 3.8l8.4 8.4`; `fail` `M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 5.2V8.6M8 10.9v.1`.

### 3.11 Layout grid and breakpoints

| Name | Width | Behavior |
|---|---|---|
| `sm` | < 640px | single column; page padding 16px |
| `md` | 640 to 899px | single column for panels; 2-column grids allowed for cards; padding 24px |
| `lg` | 900 to 1199px | S2 uses two columns (trace and progress); padding 32px |
| `xl` | >= 1200px | same as `lg`; content max-width 1120px centered |

Content container: `max-width: 1120px; margin-inline: auto`. Readable text blocks: `max-width: 70ch`. The launcher console: `max-width: 920px`.

### 3.12 Z-index

`--ab-z-base` 0; `--ab-z-sticky` 20; `--ab-z-nav` 40; `--ab-z-dialog` 60; `--ab-z-toast` 70.

---

## 4. Primitives and components

Class names are BEM with the `ab-` prefix. Each component lists anatomy, dimensions, variants, states, accessibility and data binding. All interactive elements have a minimum 44x44px hit area.

### 4.1 Buttons

| Variant | Class | Fill | Border | Text | Use |
|---|---|---|---|---|---|
| Primary | `ab-btn ab-btn--primary` | `--ab-lime` | none | `--ab-text-on-lime`, 16px / 600 | The one main action per screen |
| Secondary | `ab-btn ab-btn--secondary` | `--ab-s2` | 1px chrome edge | `--ab-text`, 15px / 500 | Other actions |
| Ghost | `ab-btn ab-btn--ghost` | transparent | none | `--ab-text-2`, 15px / 500, underline on hover | Low emphasis (Cancel, Reload) |
| Danger | `ab-btn ab-btn--danger` | `--ab-s2` | 1px `--ab-ember` at 60% | `--ab-ember` | Destructive confirm |

Sizes: default height 48px, padding 0 24px; large (launcher primary) height 56px, padding 0 32px, 17px font; small height 40px, padding 0 16px, 14px font (still 44px hit area via padding on the element wrapper). Radius pill. Icon + label gap 8px.

States: hover (primary: brightness +6% and sheen sweep once 900ms on hover or keyboard focus; secondary: border brightens to `--ab-line-strong` replaced by brighter edge, fill `--ab-s3`), pressed (`translateY(1px)`), focus-visible (2px `--ab-focus` outline, 3px offset), disabled (fill `#242935`, text `--ab-text-3`, no shadow, `cursor: not-allowed`, `aria-disabled="true"`), loading (label replaced by the loading copy, a 2px scan line along the bottom edge, button stays disabled).

### 4.2 Navigation pill

Height 52px; padding 6px; pill; fill `--ab-glass` with `backdrop-filter: blur(18px)`; chrome edge border; `--ab-shadow-pill`. Links are 40px tall pills with padding 0 16px, 14px / 500, color `--ab-text-2`. **Selected link:** fill `--ab-s3`, color `--ab-text`, `aria-current="page"`. Hover: color `--ab-text`. Wordmark "Antibody": Display 500 18px, `--ab-metal-text` fill, padding 0 12px.

If `backdrop-filter` is unsupported, fill is solid `#0E1015`.

### 4.3 Chips and badges

| Type | Class | Height | Radius | Text | Use |
|---|---|---|---|---|---|
| Mode chip | `ab-chip` | 32px | pill | 13px / 500 | Mode strip, run header meta |
| Status badge | `ab-badge` | 28px | pill | 13px / 600 | Trace status, outcomes, readiness |
| Hit/type tag | `ab-tag` | 24px | 8px | `--ab-t-mono` | Hit types, cause codes, attack ids |

Tone variants: `--ok` (lime tint, lime text), `--bad` (ember), `--warn` (amber), `--info` (ice), `--neutral` (`--ab-s3` fill, `--ab-text-2`). Structure: optional 16px icon, 6px gap, label. Chips with a state dot show a 6px dot instead of an icon.

### 4.4 Segmented control (pill tab group)

Container: height 48px, padding 4px, pill, fill `--ab-s2`, border `--ab-line-strong`. Segments: height 40px, padding 0 18px, pill, 14px / 500, color `--ab-text-2`. **Selected segment:** fill `--ab-s3`, color `--ab-text`, 1px `--ab-line-strong` border, inner top highlight `inset 0 1px 0 rgba(255,255,255,.12)`. Semantics: `role="radiogroup"` with `role="radio"` items, `aria-checked`; arrow keys move selection; selected state follows focus; `Home`/`End` jump. Used for memory mode, trace filters.

### 4.5 Fields

Text input and textarea: height 48px (textarea min-height 96px), padding 12px 16px, radius 14px, class `ab-field`, 16px text (prevents mobile zoom). Label above (14px / 600 `--ab-text`), helper below (13px `--ab-text-3`), error below (13px `--ab-ember` with `alert` icon, replaces helper). Focus: border becomes `--ab-focus` 1px plus the 2px focus ring. Character counter inside bottom-right of textarea: mono 12.5px `--ab-text-3`; turns `--ab-ember` at 100%.

Number stepper: input centered 56px wide between two 44px square buttons (minus, plus; secondary variant, icon only with `aria-label`); holds `min`/`max`; non-numeric input is rejected on blur and reset to the last valid value with the validation message shown.

Select: native `<select>` styled as a field with a chevron icon at the right (do not build a custom listbox).

### 4.6 Target card (radio card)

Size: min-height 128px; radius 20px (`--ab-r-card`); padding 20px; fill `--ab-s2`; border `--ab-line`. Content: 40px silver disc (icon inside, dark glyph `#0B0D12`) at top-left, title (h3 18px), description (14px `--ab-text-2`, max 2 lines). **Selected:** chrome-edge border, fill `--ab-s3`, a `check` icon in a 24px lime disc at top-right, `aria-checked="true"`. Hover (unselected): border `--ab-line-strong`. Semantics: `input type="radio"` visually hidden plus `label`; the group is `role="radiogroup"` with `aria-labelledby`.

### 4.7 Metric card

Row-type surface, radius 20px, padding 20px, min-height 148px, fill `--ab-s1`, border `--ab-line`. Parts: label (14px `--ab-text-2`), value line (see 8.3), footnote (13px `--ab-text-3`). Variant `--attention` (unresolved above 0): border `--ab-ember` at 50%, footnote in `--ab-ember` with `alert` icon and the words "Needs attention".

### 4.8 Stage tracker

A horizontal sequence of six stages (this is a true sequence): **Set up, Attack, Diagnose, Fix, Verify, Report**. Each stage: a 36px disc and a label below (14px). Discs joined by a 2px hairline (`--ab-line-strong`); the line segment before a completed stage is `--ab-silver` filled.

| Stage state | Disc | Label |
|---|---|---|
| Done | `--ab-silver` fill with dark `check` | `--ab-text` |
| Current | `--ab-s3` fill, 2px `--ab-lime` ring, stage number in mono | `--ab-text`, 600 |
| Upcoming | transparent, 1px `--ab-line-strong`, stage number in mono `--ab-text-3` | `--ab-text-3` |
| Revisited (loop) | as Done but with a small `retry` icon badge (16px) at the disc's top-right | `--ab-text` |

Numbers 1 to 6 appear inside discs of non-done stages (mono 13px). Below the tracker, a **loop line** (14px `--ab-text-2`): `Finding 2 of 3` and `Attempt 2 of 3` as two neutral chips, shown only while a finding is in progress. `role="list"`; each stage `role="listitem"`; current stage `aria-current="step"`. Mobile: tracker scrolls horizontally inside its plate with scroll snap; current stage auto-scrolls into view.

### 4.9 Trace row

Row surface, radius 14px (smaller than findings rows because they are dense), min-height 64px, padding 12px 16px. Grid at `lg+`: `72px 128px 1fr 156px 28px` with gap 12px. Columns: time (mono 13px `--ab-text-3`, `HH:MM:SS`), agent chip (neutral chip with 6px agent-hue dot plus agent name), main (action in mono 13px `--ab-text-2` on the first line; `output_summary` 15px `--ab-text` max 2 lines with ellipsis on the second), status badge, chevron icon. Left border 3px by status: `rejected`, `failed`, `escalated`, `blocked_out_of_scope` use `--ab-ember`; `fallback`, `needs_revision` use `--ab-amber`; `retrying` uses `--ab-ice`; others none. A "replayed" tag (ice, 24px) appears after the action if `replayed` is true. A "retry N" tag (neutral, mono) appears if `retry_count > 0`.

Expanded: inlay below the row content: three labeled fields (`Received`: `input_summary`; `Produced`: `output_summary` in full; `Goes to`: `target_agent`) and a code block with the raw JSON line (mono 12.5px, max-height 240px, scroll) with a copy button. Collapse/expand: click or Enter/Space on the row (`role="button"`, `aria-expanded`). Mobile (< 640px): grid becomes two lines: line 1 time + agent chip + status badge; line 2 action and summary.

### 4.10 Evidence chip

Inline button in claims. Height 28px, padding 0 10px, pill, 12.5px / 500, fill `--ab-s3`, border `--ab-line-strong`, prefix `evidence` icon 14px, label from section 9.3. `aria-expanded`, `aria-controls` the snippet region. **Open state:** the chip gets the chrome-edge border; directly beneath the claim, an inlay (full width of the claim) shows: source label (13px `--ab-text-2`, for example "From Zetaris" / "From the local store" / "From the target run" / "From the judge" / "From memory" / "From the guardrails" / "From the verifier" / "From the trace"), the snippet (mono 12.5px, wraps, canary already masked), and the ref string (mono 12px `--ab-text-3`, selectable). Only one snippet open per claim at a time. Escape closes the open snippet and returns focus to its chip.

Source label mapping from `EvidenceItem.source`: `zetaris` "From Zetaris", `local` "From the local store", `run` "From the target run", `judge` "From the judge", `memory` "From memory", `config` "From the guardrails", `diagnoser` "From the diagnosis", `verifier` "From the verifier", `trace` "From the trace".

### 4.11 Explanation panel

Defined in section 8.4.

### 4.12 Readiness medal

A 96px disc (72px at `sm`). Outer ring 6px metal gradient (gold, silver or bronze), inner disc `--ab-s2` with a 28px icon in a matching tone. Mapping: `ready` gold ring + `check` icon in `--ab-lime`; `ready_with_risks` silver ring + `alert` in `--ab-amber`; `not_ready` bronze ring + `x` in `--ab-ember`. A conic highlight overlays the ring (`metal.css`). The medal is decorative: `aria-hidden="true"`; the title text carries the meaning.

### 4.13 Dialog

Centered, width min(480px, 100% - 32px), plate surface, padding 28px, `--ab-shadow-float`; backdrop `rgba(5,6,9,0.72)` with blur 6px. Title (h2 24px), body (16px `--ab-text-2`), footer buttons right-aligned (Ghost cancel, then the action). Focus trap; initial focus on the **cancel** button for destructive dialogs; `Escape` and backdrop click close (cancel); focus returns to the opener. `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`. Animation: fade and 8px rise over `--ab-dur-3`.

### 4.14 Toast

Bottom center, 24px from the bottom, max-width 360px, pill-ish radius 18px, fill `--ab-s2`, chrome-edge border, 15px text with a 16px icon. `role="status"`, auto dismiss after 4000ms, pauses while hovered or focused. One toast at a time (new replaces old).

### 4.15 Banner

Full-width inside content container, radius 18px, padding 16px 20px, tone tint background (`ok`, `warn`, `bad`, `info`), 1px border in the tone at 40%, icon plus 15px text plus optional action button (secondary, small). Dismissible only where stated.

### 4.16 Code block and copy button

Inlay surface, mono 12.5px, padding 16px, `white-space: pre-wrap; word-break: break-word`, max-height 240px with inner scroll. Copy button: small ghost icon button top-right with `aria-label="Copy"`; on click copies the text, shows toast "Copied".

### 4.17 Empty, loading and error blocks

- **Empty block:** inlay surface centered, 48px padding, icon 24px `--ab-text-3`, title 16px/600, one-sentence help 14px `--ab-text-2`, optional action.
- **Loading skeleton:** inlay-shaped blocks `--ab-s2` with a slow shimmer (`--ab-sheen`, 1.6s) only if motion allowed. Skeleton text bars height 14px, radius 7px. Used while a page's first data loads (>250ms delay before showing).
- **Error block:** same as empty with `alert` icon in `--ab-ember`, plain "what happened" title, "what to do" sentence, and a retry or action button.

---
## 5. UX flows

Each flow lists the person's step, what the system shows, and the exact state. "S#" refers to screens in section 8. Flows are the contract for behavior; screens define the pixels.

### F1. First run (a judge or builder starts a run)

| # | Person does | System shows |
|---|---|---|
| 1 | Opens `/` | S1 loads. The mode strip shows skeleton chips for under 250ms, then real chips from `GET /health`. The headline plays its one-time sheen. Focus is at the top of the page (skip link first) |
| 2 | Reads the headline and sub text | Console plate shows with **no target preselected**, attack count `8`, memory `Use memory` |
| 3 | Chooses an automation card | Card shows selected state; the "Run Antibody" button becomes enabled. Until a target is chosen the button is disabled and a helper line under the button reads "Choose an automation to test." |
| 4 | (Optional) changes number of attacks or memory | Values update immediately. No server calls |
| 5 | Presses "Run Antibody" | Button changes to loading ("Starting run..."), all inputs disabled. `POST /run` with `wait: false` |
| 6 | Waits at most about 2 seconds | Success: `202 { trace_id }`. Write to `antibody.recent_runs`, navigate to `/runs/{trace_id}` (S2 in the `connecting` state). Failure: see F7; the form re-enables and keeps all values |
| 7 | Sees S2 | Header with title and trace id; stage tracker at "Set up"; trace panel says "Waiting for the first event..." until the first SSE line arrives (usually under 3 seconds) |
| 8 | Watches | Lines stream into the trace; stage tracker advances; counters update each second. The person may filter, pause scrolling, expand rows |
| 9 | Run ends | State chip becomes "Finished" (or "Finished with warnings"); stage tracker shows all done; the "Run finished" banner appears with "Jump to report". If the person is within 200px of the top of the page, the page scrolls smoothly to the report heading and focuses it; otherwise nothing scrolls. The screen reader hears "Run finished: <readiness title>" |
| 10 | Reads the report (F3) | S2b below the tracker |

### F2. Add your own attack (judge-supplied input)

| # | Person does | System shows |
|---|---|---|
| 1 | On S1, after choosing a target, presses "Add your own attack" | Disclosure opens (200ms), showing one attack item (carrier select, attack text, optional normal text) and the counter "0 of 5 attacks added" |
| 2 | Types attack text | Counter "n / 400" under the field; the "Add another attack" button appears once the first has text |
| 3 | Submits the run | Each item is validated (section 8.1.5). Invalid: inline error on that item, focus moves to the first invalid field, no request is sent |
| 4 | Valid | `custom_attacks` sent. On S2 the first trace lines say the judge-supplied attacks were included (`generate_attacks` line from the API) |
| 5 | Sees the result | In the findings table, judge-supplied attacks carry a neutral tag "Your attack". If it did not succeed the report still lists it in the "Your attacks" list inside section 8.3.8 with outcome "Blocked" or "Hit" (taken from `attack_results` if present; see section 16 item 8) |

### F3. Reading the report (intended reading order)

1. Verdict (readiness plate): is it launchable? 2. Numbers (4 metric cards): what changed? 3. Warnings: anything degraded? 4. Findings: which attacks worked and how were they fixed? 5. Guardrail diff: what did we actually change in the automation? 6. Remaining risks: what is still not covered? 7. Memory activity. 8. Evidence and downloads.

The person may open "Why this verdict?" at any time; opening it never moves the page.

### F4. Open an explanation and check evidence

| # | Person does | System shows |
|---|---|---|
| 1 | Expands a finding row (click, Enter or Space) | Row expands (200ms). Sections: The attack, What happened, Why it worked, Fix attempts, Memory (if used) |
| 2 | Reads "Why it worked" | Explanation panel: badge "Evidence checked" or "Unverified explanation"; claims with evidence chips |
| 3 | Clicks an evidence chip | Chip becomes open; the snippet inlay appears under that claim with source label, snippet and ref. Other open chips in the same claim close |
| 4 | Presses Escape | Snippet closes; focus returns to the chip |
| 5 | Finds an "Unverified explanation" | Warning styling; first validation error shown in plain words; the claims remain visible |

### F5. Cold versus warm (the story the demo tells)

| # | Person does | System shows |
|---|---|---|
| 1 | After a finished run of target A presses "Run another automation" | `/` loads with **target B preselected** and memory `Use memory` (URL `/?target=<B>&memory=warm`). A one-line hint under the memory control: "Antibody will reuse fixes it learned on the first automation." |
| 2 | Runs it | F1 steps 5 to 10. The trace shows `retrieve_memory` rows from Memory |
| 3 | Opens "Cold vs warm" in the nav | S4 shows the latest comparison from saved results, or the empty state with the command to generate it |

### F6. Degraded run (fallback, replay, budget)

Degradation never blocks the flow. During the run: the progress panel's "Heads up" list gains an item the moment the related trace line arrives (`fallback_provider`, `zetaris_query` with `source: local`, `retrieve_memory` with `memory_unavailable`). After the run: the report's warnings section lists each `degraded` code with a plain explanation (section 11.6). The readiness plate is unaffected by degradation unless the rules in `DATA_CONTRACTS.md` 11.2 change it.

### F7. Failure and recovery

| Situation | Detection | What the person sees | Recovery action |
|---|---|---|---|
| API not running | `fetch` network error or `GET /health` fails | S1: banner (bad) "Can't reach the Antibody API." with body "Start it with npm run dev, then try again." and button "Try again"; mode chips show "API unreachable" (bad) | "Try again" re-runs `GET /health` |
| Invalid form value | `400 invalid_request` with `field` | Inline error at that field, focus moves there | Fix the value, run again |
| Unknown or out-of-scope request | `400 unknown_target` / `422 out_of_scope` | Banner (bad) with the API's `message` | Change input |
| Model provider down | `502 provider_unavailable` (start) or `failed` run | Banner (bad) "The model provider did not answer." body "Antibody tried Nightshift and the NVIDIA fallback. Check that Nightshift is running and your token is set." | Button "Back to launcher" |
| Run fails mid-way | `GET /runs/{id}` returns 500 `{status:"failed"}` or SSE `end` with `failed` | S2 state "Failed"; banner (bad) "This run stopped before it finished." plus the API `error.message`; the trace stays visible | Buttons "Run again" (prefilled with the same inputs) and "Back to launcher" |
| Trace stream drops | EventSource `error` | Small banner (warn) inside the trace plate "Lost connection to the trace stream. Reconnecting..." The panel keeps the rows it has. Polling `GET /runs/{id}` every 3 seconds starts as a fallback | Automatic. After 30 seconds without a stream or a successful poll: banner (bad) "Can't reconnect. Your run may still be going." with button "Reload this page" |
| Unknown run id | `404 unknown_run` | Error block on S2: "We can't find that run." body "It may have been started on a different machine, or the API was restarted." with "Back to launcher" | Navigate away |

### F8. Review and reset memory

| # | Person does | System shows |
|---|---|---|
| 1 | Opens "Fix library" | S3 loading skeleton for up to 250ms, then the table or the empty state |
| 2 | Expands a row | Plain-words fix, rationale, reuse log |
| 3 | Presses "Reset memory" | Confirm dialog (4.13) with Cancel focused |
| 4 | Confirms | Button shows "Resetting..."; `POST /memory/reset` with header `X-Confirm: reset`; on success the table shows the empty state and a toast "Memory reset". On failure the dialog stays open with an inline error "Couldn't reset memory. Try again." |

### F9. Return to a past run

| # | Person does | System shows |
|---|---|---|
| 1 | On S1 sees "Recent runs" | Rows from `antibody.recent_runs`; each fetches `GET /runs/{id}` once to show its readiness badge |
| 2 | Opens one | `/runs/{id}`: if finished, S2 renders the stage tracker as complete and the report; the trace is **not** replayed live, it loads from `GET /runs/{id}/events` (SSE replay from line 1) into the trace panel immediately |
| 3 | Reloads a page mid-run | Page reconnects with `Last-Event-ID` so no line is duplicated (section 9.1) |

---

## 6. Global behaviors

1. **Loading:** show skeletons only after 250ms of waiting; never show a skeleton for cached or instant data.
2. **Errors:** every error states what happened and what to do; never "Something went wrong". No apologies. Use the copy in section 11.
3. **Focus:** after navigation focus goes to the page's H1 (`tabindex="-1"`). After a dialog closes, focus returns to the opener. After a run finishes and auto-scroll happens, focus goes to the report heading. After removing a custom attack item, focus goes to the "Add your own attack" button.
4. **Scroll:** no scroll hijacking. Smooth scroll only for the single auto-scroll in F1 step 9 and "Jump to report"; instant if reduced motion.
5. **Links and buttons:** navigation is a link (`<a>`); actions are buttons. Both have visible focus.
6. **Copy to clipboard:** uses `navigator.clipboard.writeText`; if it fails show toast "Couldn't copy. Select the text and copy it yourself."
7. **Downloads:** "Download report (JSON)" creates a `Blob` of the `Report` JSON (2-space indent) named `antibody-<trace_id>.json`; toast "Report downloaded".
8. **Time display:** times are local time `HH:MM:SS`; relative times "just now", "3 min ago", "2 h ago", "Yesterday", else `D Mon` (for example `24 Oct`). Updated every 30 seconds.
9. **Confirmation:** only destructive actions confirm (memory reset). Nothing else confirms.
10. **Selection and text:** all text is selectable; ids, refs and JSON are selectable with one click-drag; no user-select none except on buttons.
11. **Keyboard map:** Tab and Shift+Tab move through controls; Enter or Space activates; Arrow keys inside radiogroups; Escape closes dialogs and open snippets. No custom global shortcuts.

---

## 7. Content rules

- Sentence case. No ALL CAPS. No emoji. No exclamation marks.
- Active voice; buttons say exactly what they do; the same action keeps the same name everywhere ("Run Antibody" starts a run; the toast and the state use "run").
- Do not claim safety. Verdict language is "Ready to launch" only when the code says `ready`; the sub text always includes counts.
- Use "automation" for the thing under test, "attack" for a hostile input, "fix" for a patch, "guardrails" for the automation's own rules, "normal tasks" for the regression set, "evidence" for cited items.
- Never expose internal enum names to the person without the plain label first (section 9.4); show the code secondarily in a mono tag.
- Numbers: ASR shown with three decimals and a percent (`0.375`, `37.5%`); counts as integers; durations as `m:ss`.

---

## 8. Screens

### 8.1 S1 Launcher (`/`)

#### 8.1.1 Wireframe (desktop)

```
┌───────────────────────── nav pill (fixed) ──────────────────────────┐
│ Antibody   Run   Fix library   Cold vs warm                          │
└──────────────────────────────────────────────────────────────────────┘

                    Attack your automation first.          (metal, 76px)
                    Launch it with proof.                  (dim metal)

        Antibody attacks a sandbox copy of your automation, fixes
        what breaks, and explains every decision with evidence you
        can check.

        [Sample data: on] [Model: Nightshift] [Zetaris: connected]

 ╔═══════════════════ launch console (plate, 920px) ═════════════════╗
 ║ Choose an automation to test                                       ║
 ║ ┌─────────────────────────┐  ┌─────────────────────────┐           ║
 ║ │ (disc) Support email    │  │ (disc) Meeting notes    │           ║
 ║ │ triage                  │  │ to tasks                │           ║
 ║ │ Reads customer emails…  │  │ Reads meeting trans…    │           ║
 ║ └─────────────────────────┘  └─────────────────────────┘           ║
 ║ Number of attacks    [ - ]  8  [ + ]   More attacks find more…     ║
 ║ What Antibody remembers                                            ║
 ║ ( Use memory | Start fresh | No memory )   helper text             ║
 ║ ▸ Add your own attack                                              ║
 ║ ───────────────────────────────────────────────────────────────    ║
 ║ Choose an automation to test.                  [ Run Antibody ]    ║
 ╚════════════════════════════════════════════════════════════════════╝
   All data is fake. Attacks run only against sandbox automations.

 Recent runs                                                          
 ┌ row ─────────────────────────────────────────────────────────────┐
 │ Support email triage   run_2026…a1b2   [Ready with risks]  3 min ago│
 └──────────────────────────────────────────────────────────────────┘

 footer: Antibody. Built for the Open Agent Hackathon 2026.
```

#### 8.1.2 Layout spec

- Hero block: top padding 72px below the 96px page offset; text centered; width 760px max. H1 uses `--ab-t-display-xl`, two lines (`<span>` per line, `display:block`), line 1 `--ab-metal-text`, line 2 `--ab-metal-text-dim`. Sub text `--ab-t-body-l`, `--ab-text-2`, max-width 560px, margin-top 20px.
- Mode strip: margin-top 28px, centered, wraps, gap 8px.
- Console plate: margin-top 40px; padding 28px (`md+`), 20px (`sm`); internal groups spaced 28px. Group labels use `--ab-t-h3`. Helper text 14px `--ab-text-2`.
- Target card grid: `grid-template-columns: 1fr 1fr` at `md+`, `1fr` at `sm`; gap 16px.
- Number row: label left, stepper, helper to the right at `md+` (wraps below at `sm`).
- Memory control: segmented control full width at `sm`, auto width at `md+`; the helper text below changes with the selected option (section 11.1).
- Disclosure button "Add your own attack": ghost variant with `chevron`; aria-expanded.
- Footer row of the plate: divider (`--ab-line-strong`) then a row with the helper line (left, 14px `--ab-text-2`) and the primary button (right, large). At `sm` stacked, button full width.
- Safety line below the plate: 13px `--ab-text-3`, centered, margin-top 16px.
- Recent runs: margin-top 56px; heading `--ab-t-h2`; rows 8px apart; max 5 shown ("Show all 10" ghost button reveals up to 10).
- Footer: margin-top 96px; 13px `--ab-text-3` centered.

#### 8.1.3 Content (verbatim; section 11.1 has the full list)

H1 line 1 "Attack your automation first." Line 2 "Launch it with proof." Sub "Antibody attacks a sandbox copy of your automation, fixes what breaks, and explains every decision with evidence you can check."

Cards: "Support email triage" / "Reads customer emails, can issue small refunds and update a customer record." and "Meeting notes to tasks" / "Reads meeting transcripts, creates tasks and posts a summary to the team."

#### 8.1.4 States

| State | Behavior |
|---|---|
| Initial | No target selected; run button disabled with `aria-disabled`; helper line "Choose an automation to test." |
| Ready | Target selected; helper line replaced by a summary: "{n} attacks on {automation name}. Memory: {memory label}." |
| Invalid | Inline errors; button enabled (so submit can show errors) but submission blocked |
| Starting | All inputs disabled; button loading "Starting run..." |
| API down | Banner (F7); mode chips show "API unreachable"; the form stays usable; submit shows the F7 error again if it still fails |
| Prefilled | If `?target=` and `?memory=` are present and valid they preselect; invalid values are ignored silently |

#### 8.1.5 Validation rules

| Field | Rule | Error text |
|---|---|---|
| Target | required, one of `support_triage`, `meeting_tasks` | "Choose an automation to test." |
| Number of attacks | integer 1 to 20 | "Enter a whole number from 1 to 20." |
| Attack text | required if the item exists, 1 to 400 characters, no `http://` or `https://`, no email address except those ending `@example.test` | "Enter the attack text." / "Attack text can be at most 400 characters." / "Remove links from the attack text. Antibody only tests sandbox automations." / "Use only @example.test email addresses." |
| Normal text | optional, at most 600 characters | "Normal text can be at most 600 characters." |
| Where it appears | must be valid for the chosen target | "This automation can't receive that kind of input. Choose another place." |
| Number of custom attacks | at most 5 | the "Add another attack" button is disabled at 5 with helper "You can add up to 5 attacks." |

Validation runs on blur (for touched fields) and on submit. These are the same rules the API enforces; the API's `400` `field` messages are shown as returned if they differ.

#### 8.1.6 Recent runs row

Row surface: left: automation name (16px/600) and trace id (mono 13px `--ab-text-3`, truncated middle); right: readiness badge (from fetch: `ready` ok "Ready", `ready_with_risks` warn "Ready with risks", `not_ready` bad "Not ready", still running neutral "Running", failed bad "Failed", unreachable neutral "Unavailable") and relative start time. Whole row is a link. Empty state text: "No runs yet. Finished runs on this browser will appear here."

---

### 8.2 S2 Run view, live (`/runs/[traceId]`)

#### 8.2.1 Wireframe (desktop, running)

```
┌ nav pill ┐
 New run (ghost link)
 Support email triage                                   [Running]
 [run_2026…a1b2 (copy)] [Model: Nightshift] [Sample data: off] [Memory: use]

 ╔══════════════════ stage tracker (plate) ═══════════════════════╗
 ║  (✓)────(✓)────(③)────( 4 )────( 5 )────( 6 )                  ║
 ║ Set up Attack Diagnose  Fix     Verify  Report                  ║
 ║ [Finding 2 of 3] [Attempt 1 of 3]                               ║
 ╚═════════════════════════════════════════════════════════════════╝

 ╔═══════════ Live trace (plate) ═════════════╗  ╔═ Progress ═════════╗
 ║ ▔▔▔▔▔ scan line ▔▔▔▔▔                       ║  ║ Model calls    42  ║
 ║ (All 31)(Fix loop 12)(Memory 3)(Zetaris 4)  ║  ║ Zetaris queries 9  ║
 ║ (Explanations 6)           [Pause scrolling]║  ║ Fix attempts    3  ║
 ║ 10:15:31 Attacker generate_attacks  ✓ Done  ║  ║ Elapsed      1:12  ║
 ║ 10:15:36 Verifier verify_fix  ✕ Rejected    ║  ║ ─────────────────  ║
 ║ ...                                          ║  ║ Heads up           ║
 ║                                              ║  ║ (items or "None")  ║
 ╚══════════════════════════════════════════════╝  ╚════════════════════╝
```

Finished state adds, directly under the page header and above the tracker, the "Run finished" banner; below the trace panel the report (section 8.3) appears.

#### 8.2.2 Layout spec

- Page header: link "New run" (ghost, goes to `/`); H1 (automation name, `--ab-t-h1`); right-aligned state chip (badge). Meta chips row under the H1: trace id chip (mono, with copy icon button), model chip, data chip, memory chip (same tones as the launcher chips). Gap 8px; margin-top 12px.
- Tracker plate: margin-top 32px; padding 24px; see 4.8.
- Main grid (`lg+`): `grid-template-columns: minmax(0, 1fr) 320px; gap: 24px`; margin-top 24px. Below `lg`: single column; the progress plate goes **above** the trace plate.
- Trace plate: padding 20px; header row with the title ("Live trace", h3), the filter segmented control, and the pause button; list below; list region `max-height: calc(100vh - 360px)`, `min-height: 420px`, `overflow-y: auto`; at most 500 rows rendered, older rows behind "Show earlier lines" (ghost button at the top of the list that loads the previous 200).
- Progress plate: padding 20px; 2x2 grid of counters (label 13px `--ab-text-2`, value mono 24px `--ab-text`, tabular); divider; "Queue" line ("{n} findings left", from the latest `select_finding` and `queue_pruned` lines; hidden before the first); "Run settings" list (Automation, Attacks, Memory, Seed — from the request echoed in the first trace line or from `localStorage`-stored request; if unknown omit); "Heads up" list.
- Sticky behavior: none (no sticky columns).

#### 8.2.3 States of S2

| State | Chip | Trace panel | Tracker | Extra |
|---|---|---|---|---|
| `connecting` | "Starting" (info) | skeleton rows ×3 and "Waiting for the first event..." | all upcoming; stage 1 current | none |
| `running` | "Running" (info, with the scan line active) | rows streaming | live | counters tick |
| `lost` (stream down) | "Running" with warn banner inside trace plate | rows kept | frozen | polling in background |
| `finished` | "Finished" (ok) or "Finished with warnings" (warn) if `degraded` non-empty | rows kept; scan line stops | all done | banner + report |
| `failed` | "Failed" (bad) | rows kept | stops where it stopped; current stage shows `fail` icon | failure banner (F7) |
| `not_found` | none | none | none | error block (F7) |

#### 8.2.4 Filters (trace panel)

| Filter | Shows lines where |
|---|---|
| All | any |
| Fix loop | `agent_name` is `Fixer` or `Verifier`, or `action` is one of `select_finding`, `commit_fix`, `queue_pruned`, `escalate` |
| Memory | `agent_name` is `Memory` |
| Zetaris | `action` is `zetaris_query` |
| Explanations | `action` is `build_evidence_packet` or `validate_explanation` |

Each filter label shows its live count. Selected filter persists in component state only (resets on navigation).

#### 8.2.5 Scrolling behavior of the trace list

- If the list is scrolled to within 48px of the bottom and "Pause scrolling" is off, new rows scroll into view instantly.
- If the person scrolls up, auto-scroll stops and a floating small secondary button "Jump to latest" appears centered at the bottom of the list; pressing it scrolls to bottom and re-enables auto-follow.
- "Pause scrolling" toggles to "Resume scrolling"; paused state never auto-scrolls even at the bottom.
- Rows stay expanded if the person expanded them.

#### 8.2.6 "Run finished" banner

Tone `ok` (or `warn` if degraded): icon, text "Run finished. {readiness title}." and a secondary small button "Jump to report". It is a polite live region (`role="status"`). Not dismissible.

---

### 8.3 S2b Report (inside S2, below the trace)

The report region is `<section id="report" aria-labelledby="report-h">`; its heading (`h2`, text "Report", `--ab-t-h2`, `tabindex="-1"`) is the focus target after a run ends.

#### 8.3.1 Wireframe

```
 Report
 ╔═════════════════════ readiness plate ══════════════════════════════╗
 ║  ( medal )  Ready with risks                                         ║
 ║             Attack success rate went from 0.375 to 0.125. 10 of 10  ║
 ║             normal tasks still pass. 1 attack could not be fixed.   ║
 ║             [Why this verdict?] [Download report (JSON)]             ║
 ║             [ Run another automation ]                               ║
 ╚══════════════════════════════════════════════════════════════════════╝
   (explanation panel for the verdict, when opened)

 ┌ Attack success rate ┐ ┌ Normal tasks passing ┐ ┌ Fixes ┐ ┌ Unresolved ┐
 │ 0.375 > 0.125       │ │ 10/10 > 10/10        │ │ 2     │ │ 1           │
 └─────────────────────┘ └──────────────────────┘ └───────┘ └─────────────┘

 (warning banners, if any)

 What broke and how it was fixed                      (h2)
 Attack   Type   What happened   Cause   Fix   Tries   Outcome
 ▸ row ...
 1 other attack stopped working after an earlier fix...

 Guardrails before and after                          (h2)
 [ Before ]            [ After ]

 What is still risky                                  (h2)
 • list

 What Antibody remembered                             (h2)
 retrieved / stored chips

 Evidence and files                                   (h2)
 [Download report (JSON)] trace path (copy)
```

#### 8.3.2 Readiness plate

- Plate surface with `padding: 32px`; grid `auto 1fr`, gap 28px; at `sm` the medal sits above the content.
- **Gold/silver/bronze rim:** the **plate's own chrome edge** is replaced by the verdict metal for this plate only (`ab-plate--gold|silver|bronze` sets the border-box gradient to that metal). Inner fill `--ab-s1`.
- Title: `--ab-t-display-l`, `--ab-metal-text` fill. Text: `ready` "Ready to launch", `ready_with_risks` "Ready with risks", `not_ready` "Not ready".
- Summary sentence (`--ab-t-body-l`, `--ab-text-2`, max 62ch), built by code from the report using these templates (the first matching row, then optional additions):

| Condition | Sentence |
|---|---|
| `hits_before == 0` | "No attack succeeded in this run." then "{regression_after.passed} of {regression_after.total} normal tasks pass." |
| otherwise | "Attack success rate went from {asr_before} to {asr_after}." then "{regression_after.passed} of {regression_after.total} normal tasks still pass." |
| `unresolved > 0` | append "{unresolved} attack(s) could not be fixed." (use "1 attack could not be fixed." or "N attacks could not be fixed.") |
| `regression_newly_failing.length > 0` | append "{n} normal task(s) broke." (singular/plural) |

- Buttons row (margin-top 24px): "Why this verdict?" (secondary; `aria-expanded`), "Download report (JSON)" (secondary), "Run another automation" (primary, large). On `sm` buttons stack full width with the primary last.
- "Run another automation" links to `/?target=<the other automation id>&memory=warm`.
- The verdict explanation panel (subject `readiness`) opens inline directly under the plate, same width, inlay surface (section 8.4). It never pushes the plate; it opens below it.

#### 8.3.3 Metric cards

Grid: 4 columns at `xl`, 2 at `md` and `lg`, 1 at `sm`; gap 16px; margin-top 24px. Each is a metric card (4.7).

| Card | Label | Value | Footnote |
|---|---|---|---|
| 1 | "Attack success rate" | `{asr_before}` (text-3, `--ab-t-num-xl`) `chevron-right` icon (24px, `--ab-text-3`) `{asr_after}` (`--ab-metal-text`, `--ab-t-num-xl`); under each number its percent in 14px | "{hits_before} of {attacks_total} attacks succeeded before. {hits_after} after." |
| 2 | "Normal tasks passing" | `{regression_before.passed}/{regression_before.total}` to `{regression_after.passed}/{regression_after.total}` same styling | if `regression_newly_failing.length > 0`: "{n} normal task(s) broke." in `--ab-ember`; else "No normal task broke." |
| 3 | "Fixes accepted" | `{fixes_accepted}` (metal) | "{fixes_rejected} fix(es) rejected on the way. {fix_attempts_total} proposals in total." |
| 4 | "Unresolved attacks" | `{unresolved}` (metal if 0, `--ab-ember` if above 0) | 0: "None left." ; above 0: "Needs attention" with `alert` icon (variant `--attention`) |

The percent under ASR values: `(value * 100).toFixed(1)` + "%".

#### 8.3.4 Warnings (only if `degraded` is not empty)

One banner (tone `warn`) per code, order as in the array, with the copy from section 11.6. Margin-top 16px. The group has a visually hidden heading "Warnings".

#### 8.3.5 Findings table

Heading `h2` "What broke and how it was fixed". If `findings` is empty: empty block "No attack succeeded, so nothing needed fixing." plus help "This does not prove the automation is safe. See what is still risky below."

Table semantics: use real `<table>` at `lg+` (`role` default) with `<th scope="col">` headers; below `lg` render the same data as a list of stacked row cards (each a `<details>`-like disclosure).

Columns (`lg+`): grid widths `160px 150px 190px 150px 190px 70px 150px 40px`:

| Column | Content |
|---|---|
| Attack | attack id in mono tag; if `attack.source == "judge"` also neutral tag "Your attack" |
| Type | plain attack class (section 9.4) |
| What happened | plain hit type(s) (section 9.4), joined by line breaks (one per line, no separators) |
| Cause | plain cause + mono code tag (for example "Obeyed hidden instructions" and `FT-01`) |
| Fix | plain fix type(s) of the accepted fix; if none "None" ; plus tag "Used memory" if `origin == "memory_reuse"` or "Fallback" if `origin == "fallback"` |
| Tries | number of fix attempts for this finding (count of fixes) |
| Outcome | badge: accepted fix → ok "Fixed" ; fallback accepted → warn "Fixed with fallback" ; none accepted → bad "Unresolved" |
| (chevron) | expand control |

Header row: caption style, `--ab-text-3`, sentence case. Rows: row surface, 72px min height. The whole row is the expand button (`aria-expanded`, `aria-controls`).

Beneath the table: if `hits_before - findings.length > 0`: a note (14px `--ab-text-2`) "{n} other attack(s) stopped working after an earlier fix, so they did not need their own."

**Expanded finding panel** (inlay, padding 24px, sections spaced 24px, each with an `h3`):

1. **"The attack"**: code-like inlay showing the composed input (benign text plus injected text in the order given by `attack.placement`); the injected part wrapped in `<mark class="ab-mark">` (background `rgba(255,122,89,0.18)`, underline `--ab-ember`). Under it, two small fields: "Where it appears" (carrier plain name) and "Attack type" (plain class).
2. **"What happened"**: one line per judge hit: plain hit label, then the hit's `evidence` text (mono 12.5px). Source: `findings[i].hits`.
3. **"Why it worked"**: explanation panel for the diagnosis (8.4).
4. **"Fix attempts"**: one **attempt card** per `Fix` in order. Attempt card: header row with "Attempt {n}" (h3), a status badge (accepted ok "Accepted"; rejected bad "Rejected"; proposed neutral "Not verified"), and origin tag ("Written by Antibody", "Based on memory", "Fallback"); body: **What changed** (list of ops in plain words, section 9.4); **Why this fix** (explanation panel for the fix); **Result of verification**: for a rejection, a banner (bad) listing each rejection reason in plain words (section 11.5) with the detail text and the failing normal task names as mono tags; for an accepted fix, a banner (ok) "This fix blocked the attack and no normal task broke." plus the verification explanation panel.
5. **"Memory"** (only if any fix has `used_mem_id`): "Used memory {mem_id}" with the evidence chip for `memory:<mem_id>`.

Only one finding may be expanded at a time on `sm`; on larger screens multiple may be open.

#### 8.3.6 Guardrails before and after

Heading `h2` "Guardrails before and after". Two inlay columns (stacked at `sm`), headings "Before" and "After". Each lists three groups with `h3`: "Rules for the model" (`prompt_rules`), "Tool permissions" (`tool_permissions`), "Input filters" (`input_filters`). Item formats (section 9.4). In **After**, items not present in Before carry a left border 3px `--ab-lime` and the word "added" (13px, lime) right-aligned; tool permissions that changed show the new text with the word "changed". If `config_before` equals `config_after`: single inlay "No guardrails changed in this run."

#### 8.3.7 What is still risky

Heading `h2`. List from `remaining_risks` (each a 16px paragraph with a `shield` icon at the start). Plus, for each unresolved attack, an item "Attack {id} could not be fixed: {last rejection detail}." (built by the UI from `unresolved`). If `remaining_risks` is empty (should not happen), show the fixed sentence "Attack classes outside this library were not tested."

#### 8.3.8 Your attacks (only if `request.custom_attacks` is non-empty)

Heading `h2` "Your attacks". One row per entry of `Report.custom_attack_results`: attack id in a mono tag, carrier in plain words, the attack text truncated to 120 characters, and an outcome badge: `hit` bad "Succeeded", `blocked` ok "Blocked", `error` neutral "Errored". A row whose attack produced a finding links to that finding (pressing it expands the finding row above). Place this section directly after the findings table.

#### 8.3.9 Memory activity

Heading `h2` "What Antibody remembered". Two groups: "Used from earlier runs" (chips for `memory.retrieved` ids) and "Saved from this run" (chips for `memory.stored` ids). Each chip links to `/memory#<mem_id>`. Empty group text: "Nothing was used." / "Nothing was saved."

#### 8.3.10 Evidence and files

Heading `h2` "Evidence and files". Row of items: "Download report (JSON)" (secondary), "Trace file" with the `trace_path` (mono, selectable) and a copy icon button, and the line "Every claim in this report links to evidence from this run." (14px `--ab-text-2`).

---

### 8.4 Explanation panel (S2b-1)

Used for: diagnosis ("Why it worked"), fix ("Why this fix"), verification ("Why it was accepted" / "Why it was rejected"), unresolved ("Why it could not be fixed"), readiness ("Why this verdict"). Data: the `Explanation` and `Report.evidence`.

```
 ┌ inlay ───────────────────────────────────────────────────────────┐
 │ Why it worked                        [✓ Evidence checked]         │
 │ Checked: every piece of evidence below exists in this run.        │
 │                                                                    │
 │ Cause   The email body contained an instruction to reveal the key │
 │         and the target followed it.                                │
 │         [evidence: attack input] [evidence: tool call step 1]      │
 │         [evidence: judge hit]                                      │
 │ ┌ snippet (when a chip is open) ──────────────────────────────┐   │
 │ │ From the target run                                          │   │
 │ │ send_reply {to: cust1@example.test, body: "… CANARY-***"}    │   │
 │ │ run:run_2026…/atk_exf_001/t1#step1                            │   │
 │ └──────────────────────────────────────────────────────────────┘   │
 │ Decision  …                                                        │
 └────────────────────────────────────────────────────────────────────┘
```

Spec:

- Header: title (h3 18px) and the badge at the right. Verified: ok badge with `check` "Evidence checked". Unverified: warn badge with `alert` "Unverified explanation".
- Under the header, verified: line "Checked: every piece of evidence below exists in this run." (14px `--ab-text-2`). Unverified: banner (warn) "This explanation could not be fully checked against the run's evidence. Treat it as a hint, not a fact." plus the **first** `validation_errors` entry translated to plain words (section 11.7) and a disclosure "Show all checks that failed" listing all errors in mono.
- Claims: ordered list. Each claim row: kind label on the left (80px column, 13px / 600, text `Cause`, `Decision`, `Outcome`, `Risk`; tones: Cause ember-tinted dot, Decision ice, Outcome lime, Risk amber; a 6px dot plus the word), text (16px), then evidence chips (wrap, gap 8px). Snippets open under the claim row (4.10).
- Code-generated explanations (`generated_by: "code"`) show a small neutral tag "Generated from run data" after the title. Model-written show "Written by Antibody's model" (neutral tag).
- Missing explanation: error block row "No explanation was produced for this step."

---

### 8.5 S3 Fix library (`/memory`)

#### Wireframe

```
 Fix library                                                  (h1)
 What Antibody has learned from earlier runs.     [Reset memory]
 ┌ row ───────────────────────────────────────────────────────────────┐
 │ mem_9c1e07ab  Support email triage  Obeyed hidden instructions     │
 │ Secret extraction · … Trust ▓▓▓▓▓░ 0.7   Verified   2 worked 0 failed ▸│
 └────────────────────────────────────────────────────────────────────┘
```
(The "·" above is wireframe shorthand only; in the UI use separate labeled columns.)

Spec: header with H1 `--ab-t-h1`, sub text 16px `--ab-text-2` "What Antibody has learned from earlier runs. Newer runs can reuse these fixes."; "Reset memory" secondary button with ember text at the right. Rows (row surface, 72px): columns at `lg+`: `140px 170px 220px 150px 150px 140px 150px 40px` = Memory id (mono tag), Learned on (plain automation name), Cause (plain + code tag), Attack type (plain), Fix (plain fix types), Trust (bar 96px × 8px, fill lime if ≥ 0.7, amber if 0.3 to 0.69, ember if below 0.3, plus number `0.70` mono), Outcome (badge: `verified` ok "Verified", `unresolved` warn "Unresolved"), chevron. Header labels: "Memory", "Learned on", "Cause", "Attack type", "Fix", "Trust", "Outcome". Expanded inlay: "What the fix does" (ops in plain words), "Why it was written" (the record's `rationale`), "Reuse history" (list from `reuse_log`: automation, run id mono, result badge "Worked" ok / "Failed" bad; empty: "Not reused yet."). Row `id` attribute = `mem_id` so `/memory#mem_x` opens and expands that row. Sort: newest first (`created_at`). Empty state: "Nothing learned yet." help "Run an automation to start building the fix library." with the primary button "Run Antibody" linking to `/`. Loading: 4 skeleton rows. Error: error block "Can't load the fix library." help "Check that the API is running." button "Try again".

### 8.6 S4 Cold vs warm (`/compare`) (cut-list item 6)

Header H1 "Cold vs warm"; sub text "Same automation, same attacks, same seed. The only difference is whether Antibody could reuse earlier fixes." Data: latest `data/comparison/*.json` read on the server (section 16 item 7). Content:

1. Meta chips: "Automation: {name}", "Learned from: {source automation name}", "Pairs run: {n}", "Seed: {seed}", "Created {relative time}" (separate chips).
2. Comparison table (row surfaces): columns "Measure", "Cold", "Warm", "Difference". Each pair is shown separately; never average or pick the best pair. With multiple pairs, render one table per pair under headings "Pair 1", "Pair 2", "Pair 3". Rows (measure labels): "Fix attempts", "Fixes accepted on the first try", "Fixes rejected", "Model calls", "Time (m:ss)", "Attack success rate after fixes", "Unresolved attacks".
3. Difference cell: number plus a word: "fewer", "more", "same", and tone: lime if warm is better for that measure, ember if worse, neutral if the same. Direction of "better": lower is better for attempts, rejected, calls, time, ASR after, unresolved; higher is better for first-try accepts. **Never hide a worse result.**
4. Under the tables a link to each run's report: "Open cold run" and "Open warm run" (to `/runs/{trace_id}`).
5. Empty state: "No comparison yet." help "Run npm run demo:cold-warm to create one." Error: "Couldn't read the comparison file."

### 8.7 S5 Not found

Centered block: display-l (metal) "We can't find that page." body "Check the address, or go back to the launcher." primary button "Back to launcher".

---
## 9. Data handling in the UI

### 9.1 Run state machine (client, `app/lib/useRun.ts`)

States: `connecting` → `running` → (`finished` | `failed`); side state `lost` (stream down) returns to `running` on recovery; `not_found` terminal.

| From | Event | To | Action |
|---|---|---|---|
| (page load) | route opens | `connecting` | `GET /runs/{id}`: 404 → `not_found`; 200 Report → `finished` and load trace via SSE replay; 500 failed → `failed`; 202 → open `EventSource("/runs/{id}/events")` |
| `connecting` | first `trace` event | `running` | render row |
| `running` | `trace` event | `running` | append row (dedupe by `id`), update counters and tracker |
| `running` | `end` event `finished` | `finished` | `GET /runs/{id}` for the Report; render report; announce; auto-scroll rule (F1 step 9) |
| `running` | `end` event `failed` | `failed` | `GET /runs/{id}` for the error; show failure banner |
| `running` | EventSource `error` | `lost` | start polling `GET /runs/{id}` every 3000ms |
| `lost` | EventSource reconnects (open event) | `running` | stop polling |
| `lost` | poll returns Report | `finished` | as above |
| `lost` | poll returns 500 failed | `failed` | as above |
| `lost` | 30000ms with no recovery | `lost` (hard) | show "Can't reconnect" banner (F7) |

Dedupe: each SSE event carries `id` = trace line number (1-based). The client keeps the highest id seen and ignores duplicates. The browser's automatic `Last-Event-ID` resumes after the last seen line.

Batching: collect incoming events and flush to React state at most once per `requestAnimationFrame` (and at most every 100ms) to avoid render storms.

Counters (derived by scanning lines): Model calls = lines with `action == "llm_call"`; Zetaris queries = `action == "zetaris_query"`; Fix attempts = lines with action in (`propose_fix`, `revise_fix`, `apply_fallback_fix`); Elapsed = (now or last line time) minus first line time, `m:ss`.

Progress meta: optional `meta` object on trace lines (`finding_index`, `findings_total`, `attempt`, `attempts_max`, `queue_left`). The tracker's loop chips and the "Queue" line read the **latest** line that has each key. If a key never appears, hide that chip.

"Heads up" list items are created from lines: `fallback_provider` → "Switched model provider"; `zetaris_query` whose `output_summary` begins with "local store" → "Zetaris unavailable, using the local store"; `retrieve_memory` with `status: "fallback"` → "Memory unavailable"; `validate_explanation` with `status: "needs_revision"` or `"failed"` → "An explanation could not be fully checked"; any line with `replayed: true` → "Model output is replayed from recordings" (once). Each item appears once.

### 9.2 Trace action to stage mapping (`app/lib/stage.ts`)

Stages in order: 1 Set up, 2 Attack, 3 Diagnose, 4 Fix, 5 Verify, 6 Report.

| Action | Sets current stage to |
|---|---|
| `load_target` | Set up |
| `generate_attacks`, `mutate_attack`, `execute_attack` | Attack |
| `diagnose_finding` | Diagnose |
| `retrieve_memory`, `propose_fix`, `revise_fix`, `apply_fallback_fix` | Fix |
| `verify_fix`, `final_verify`, `commit_fix`, `store_memory`, `update_trust`, `queue_pruned`, `escalate` | Verify |
| `build_report` | Report |
| `judge_run`, `select_finding`, `build_evidence_packet`, `validate_explanation`, `zetaris_query`, `llm_call`, `fallback_provider`, `blocked_out_of_scope` | (no change) |

Rules: the **current** stage is the stage set by the latest stage-setting line. Stages with a lower number than the current stage that have been reached are `done`. Stages with a higher number are `upcoming`, even if previously reached (after a loop back). A stage set again after a later stage was reached gets the **revisited** badge for the rest of the run. When the run is `finished`, all six are `done`. On `failed`, the current stage shows the `fail` icon.

### 9.3 Evidence chip labels (`app/lib/evidence.ts`)

Truncate a label to 32 characters with an ellipsis; the full label is in `aria-label` and `title`.

| Ref pattern | Label |
|---|---|
| `attack:<id>` | `attack input` |
| `run:<run_ref>#step<N>` | `tool call step N` |
| `hit:<run_ref>#<k>` | `judge hit` (if k > 0: `judge hit {k+1}`) |
| `zetaris:policies/<target>:<tool>` | `policy: <tool> (Zetaris)` |
| `local:policies/<target>:<tool>` | `policy: <tool> (local store)` |
| `zetaris:attacks/<id>` / `local:attacks/<id>` | `attack record (Zetaris)` / `attack record (local store)` |
| `zetaris:fixes/<mem>` / `local:fixes/<mem>` | `past fix <mem> (Zetaris)` / `past fix <mem> (local store)` |
| `memory:<mem>` | `memory <mem>` |
| `config:<target>@v<n>/prompt_rules` | `guardrails: rules for the model (v<n>)` |
| `config:<target>@v<n>/tool_permissions.<tool>` | `guardrails: <tool> permission (v<n>)` |
| `config:<target>@v<n>/input_filters` | `guardrails: input filters (v<n>)` |
| `diagnosis:<finding>` | `diagnosis` |
| `verify:<fix>` | `verification of <fix>` |
| `suite:before` | `results before fixes` |
| `suite:after` | `results after fixes` |
| `trace:<trace>#<n>` | `trace line n` |
| any other | the ref itself, mono (never guess) |

The `(Zetaris)` and `(local store)` text comes **only** from the ref prefix and must never be swapped.

### 9.4 Plain-language maps (`app/lib/labels.ts`)

**Hit types:** `canary_leak` "Leaked the secret key"; `disallowed_tool_call` "Used a forbidden tool"; `arg_policy_violation` "Broke a tool rule"; `step_cap_exceeded` "Looped past the step limit"; `token_cap_exceeded` "Used too many tokens".

**Root causes:** `FT-01` "Obeyed hidden instructions"; `FT-02` "Secret exposed without need"; `FT-03` "Tool rules not enforced"; `FT-04` "Never stopped"; `FT-05` "Fix was too broad"; `FT-99` "Cause not identified". Always followed by the code in a mono tag.

**Attack classes:** `injection_override` "Instruction override"; `injection_exfil` "Secret extraction"; `policy_bypass` "Rule bypass"; `loop_induction` "Loop trigger"; `canary_probe` "Direct secret probe".

**Fix types:** `prompt_rule` "New rule for the model"; `tool_permission` "Tool permission change"; `input_filter` "Input filter"; `approval_gate` "Approval required".

**Carriers:** `email_body` "Email body"; `ticket_field` "Ticket field"; `transcript_line` "Transcript"; `form_field` "Form field".

**Tool kinds:** `money` "Moves money"; `record_write` "Writes records"; `outbound_message` "Sends messages"; `data_export` "Exports data"; `destructive` "Deletes data".

**Automations:** `support_triage` "Support email triage"; `meeting_tasks` "Meeting notes to tasks".

**Trace status (label, icon, tone):** `success` "Done" `check` ok; `partial_success` "Partly done" `check` neutral; `needs_revision` "Needs revision" `edit` warn; `rejected` "Rejected" `x` bad; `retrying` "Retrying" `retry` info; `fallback` "Fallback used" `alert` warn; `escalated` "Escalated" `escalate` bad; `blocked_out_of_scope` "Blocked: out of scope" `blocked` bad; `failed` "Failed" `fail` bad.

**Agent names** are displayed as the `agent_name` value.

**Fix ops in plain words** (`add_prompt_rule`, `set_tool_permission`, `add_input_filter`):

| Op | Text |
|---|---|
| `add_prompt_rule` | `Add rule: "{rule}"` |
| `set_tool_permission` with `enabled: false` | `Turn off {tool}` |
| `set_tool_permission` with `requires_approval: true` | `Require approval for {tool}` |
| `set_tool_permission` with `max_amount: N` | `Limit {tool} amount to {N}` |
| `add_input_filter` kind `wrap_untrusted` | `Treat {carriers} text as data, not instructions` |
| `add_input_filter` kind `strip_pattern` | `Remove text matching "{pattern}" from {carriers}` |
| `add_input_filter` kind `block_pattern` | `Reject inputs matching "{pattern}" in {carriers}` |

An op with several fields produces one line per field. `{carriers}` is the plain carrier names lowercased and joined with commas and "and" before the last (for example "email body and ticket field"). `{tool}` is shown in mono.

**Guardrail items (diff columns):** prompt rule: the rule text. Tool permission: `{tool}: on`, `{tool}: off`, `{tool}: needs approval`, `{tool}: limited to amount {n}` (join several with commas). Input filter: the same sentences as the ops table.

### 9.5 Formatting (`app/lib/format.ts`)

| Value | Format |
|---|---|
| ASR | three decimals (`0.375`) and percent with one decimal (`37.5%`) |
| Counts | integers, no separators below 10,000 |
| Duration | `m:ss` (`1:12`); under 1 second show `0:00` |
| Time of day | local `HH:MM:SS` 24-hour |
| Relative time | section 6 item 8 |
| Trust | two decimals (`0.70`) |
| Ids | as is, mono; truncated in the middle (`run_2026…a1b2`) only when the container is narrower than the id, with the full value in `title` and copyable |
| Pluralization | "1 attack", "2 attacks", "1 normal task", "2 normal tasks" |

---

## 10. Accessibility (target: WCAG 2.2 AA; `ASSUMED`)

1. `<html lang="en">`; one `h1` per page; heading levels never skip (H1 page title, H2 report sections, H3 panels).
2. Landmarks: `header`, `nav` (aria-label "Main"), `main#main`, `footer`; "Skip to content" link first.
3. Contrast: text at least 4.5:1 (3:1 for 24px and larger or 19px bold); UI component borders and icons at least 3:1 against their background. Token values in section 3.1 already meet this; do not introduce other text colors.
4. Focus: every interactive element has a visible 2px `--ab-focus` ring with 3px offset; focus order follows visual order; no focus trap except dialogs; never `outline: none` without replacement.
5. Names: every icon-only button has `aria-label`; every input has a visible `label` linked by `for`; groups use `fieldset` and `legend` or `role="radiogroup"` with `aria-labelledby`.
6. Roles and states: expandable rows and chips use `aria-expanded` and `aria-controls`; selected nav link `aria-current="page"`; current stage `aria-current="step"`; badges include text (never icon only); decorative icons and the medal `aria-hidden="true"`.
7. Live regions: one visually hidden polite live region per page (`aria-live="polite"`, `aria-atomic="true"`) for announcements: stage changes ("Stage: Fix"), "A fix was rejected.", "Run finished: Ready with risks.", "Run failed." Announce at most once every 3 seconds; **the trace list itself is not a live region** (it would flood screen readers).
8. Forms: errors are linked with `aria-describedby`, the invalid field has `aria-invalid="true"`, and focus moves to the first invalid field on a failed submit. Required fields are marked with the word "required" in the label, not only an asterisk.
9. Tables: real `<table>` with `<th scope="col">` at `lg+`; stacked lists below. Expanding a row does not change the DOM order of other rows.
10. Motion: respect `prefers-reduced-motion` (section 3.9). Nothing flashes more than 3 times per second.
11. Zoom and reflow: usable at 200% zoom and at 320px width without horizontal page scroll (inner scroll only for code blocks and the tracker).
12. Touch targets at least 44x44px (chips inside text may be 28px tall but have 44px tall hit areas via padding on a wrapper where adjacent targets are closer than 8px).
13. Color is never the only cue: tone always comes with a word and an icon.
14. Timeouts: none, except the 4-second toast (it pauses on hover or focus and its content is repeated in the live region).

---

## 11. Copy deck (all strings live in `app/copy.ts`; do not write strings inline)

### 11.1 Launcher

| Key | String |
|---|---|
| `s1.h1.line1` | Attack your automation first. |
| `s1.h1.line2` | Launch it with proof. |
| `s1.sub` | Antibody attacks a sandbox copy of your automation, fixes what breaks, and explains every decision with evidence you can check. |
| `s1.mode.sample.on` / `.off` | Sample data: on / Sample data: off |
| `s1.mode.model.meterless` | Model: Nightshift |
| `s1.mode.model.nvidia` | Model: NVIDIA direct (fallback) |
| `s1.mode.model.replay` | Model: replayed recordings |
| `s1.mode.zetaris.up` | Zetaris: connected |
| `s1.mode.zetaris.fallback` | Zetaris: local store |
| `s1.mode.api.down` | API unreachable |
| `s1.group.target` | Choose an automation to test |
| `s1.target.support.title` / `.desc` | Support email triage / Reads customer emails, can issue small refunds and update a customer record. |
| `s1.target.meeting.title` / `.desc` | Meeting notes to tasks / Reads meeting transcripts, creates tasks and posts a summary to the team. |
| `s1.attacks.label` | Number of attacks |
| `s1.attacks.helper` | More attacks find more problems and take longer. |
| `s1.memory.label` | What Antibody remembers |
| `s1.memory.warm` / `.cold` / `.off` | Use memory / Start fresh / No memory |
| `s1.memory.warm.helper` | Reuse fixes learned in earlier runs. |
| `s1.memory.cold.helper` | Ignore past fixes for this run only. |
| `s1.memory.off.helper` | Don't read or save any fixes. |
| `s1.memory.prefill.hint` | Antibody will reuse fixes it learned on the first automation. |
| `s1.custom.toggle` | Add your own attack |
| `s1.custom.help` | Paste text an attacker might hide in an email or transcript. Antibody will include it in this run. |
| `s1.custom.where` | Where it appears |
| `s1.custom.text` | Attack text |
| `s1.custom.normal` | Normal text around it (optional) |
| `s1.custom.add` | Add another attack |
| `s1.custom.remove` | Remove this attack |
| `s1.custom.count` | {n} of 5 attacks added |
| `s1.custom.max` | You can add up to 5 attacks. |
| `s1.run` | Run Antibody |
| `s1.run.starting` | Starting run... |
| `s1.helper.empty` | Choose an automation to test. |
| `s1.helper.ready` | {n} attacks on {automation}. Memory: {memory}. |
| `s1.safety` | All data is fake. Attacks run only against sandbox automations. |
| `s1.recent.h` | Recent runs |
| `s1.recent.empty` | No runs yet. Finished runs on this browser will appear here. |
| `s1.recent.more` | Show all |
| `footer` | Antibody. Built for the Open Agent Hackathon 2026. |

### 11.2 Run view

| Key | String |
|---|---|
| `s2.new` | New run |
| `s2.state.starting` / `.running` / `.finished` / `.finishedWarn` / `.failed` | Starting / Running / Finished / Finished with warnings / Failed |
| `s2.stage.1` to `.6` | Set up / Attack / Diagnose / Fix / Verify / Report |
| `s2.loop.finding` | Finding {i} of {n} |
| `s2.loop.attempt` | Attempt {i} of {n} |
| `s2.trace.h` | Live trace |
| `s2.trace.waiting` | Waiting for the first event... |
| `s2.filter.all` / `.fix` / `.memory` / `.zetaris` / `.explain` | All / Fix loop / Memory / Zetaris / Explanations |
| `s2.pause` / `.resume` | Pause scrolling / Resume scrolling |
| `s2.jump.latest` | Jump to latest |
| `s2.earlier` | Show earlier lines |
| `s2.row.received` / `.produced` / `.goesto` | Received / Produced / Goes to |
| `s2.progress.calls` / `.zetaris` / `.attempts` / `.elapsed` | Model calls / Zetaris queries / Fix attempts / Elapsed |
| `s2.progress.queue` | {n} findings left |
| `s2.progress.settings` | Run settings |
| `s2.progress.headsup` | Heads up |
| `s2.progress.none` | Nothing to flag. |
| `s2.finished.banner` | Run finished. {verdict}. |
| `s2.finished.jump` | Jump to report |
| `s2.stream.lost` | Lost connection to the trace stream. Reconnecting... |
| `s2.stream.dead.title` | Can't reconnect. |
| `s2.stream.dead.body` | Your run may still be going. |
| `s2.stream.reload` | Reload this page |
| `s2.failed.title` | This run stopped before it finished. |
| `s2.failed.again` | Run again |
| `s2.back` | Back to launcher |
| `s2.notfound.title` | We can't find that run. |
| `s2.notfound.body` | It may have been started on a different machine, or the API was restarted. |

### 11.3 Report

| Key | String |
|---|---|
| `s2b.h` | Report |
| `s2b.verdict.ready` / `.risks` / `.not` | Ready to launch / Ready with risks / Not ready |
| `s2b.verdict.why` | Why this verdict? |
| `s2b.download` | Download report (JSON) |
| `s2b.again` | Run another automation |
| `s2b.sentence.none` | No attack succeeded in this run. {passed} of {total} normal tasks pass. |
| `s2b.sentence.rate` | Attack success rate went from {before} to {after}. {passed} of {total} normal tasks still pass. |
| `s2b.sentence.unresolved` | {n} attack(s) could not be fixed. (write "1 attack could not be fixed." / "{n} attacks could not be fixed.") |
| `s2b.sentence.broke` | {n} normal task(s) broke. (write "1 normal task broke." / "{n} normal tasks broke.") |
| `s2b.metric.asr` | Attack success rate |
| `s2b.metric.asr.foot` | {hits_before} of {total} attacks succeeded before. {hits_after} after. |
| `s2b.metric.tasks` | Normal tasks passing |
| `s2b.metric.tasks.ok` | No normal task broke. |
| `s2b.metric.fixes` | Fixes accepted |
| `s2b.metric.fixes.foot` | {rejected} fix(es) rejected on the way. {total} proposals in total. |
| `s2b.metric.unres` | Unresolved attacks |
| `s2b.metric.unres.zero` | None left. |
| `s2b.metric.unres.some` | Needs attention |
| `s2b.findings.h` | What broke and how it was fixed |
| `s2b.findings.empty.title` | No attack succeeded, so nothing needed fixing. |
| `s2b.findings.empty.body` | This does not prove the automation is safe. See what is still risky below. |
| `s2b.findings.cols` | Attack / Type / What happened / Cause / Fix / Tries / Outcome |
| `s2b.findings.pruned` | {n} other attack(s) stopped working after an earlier fix, so they did not need their own. |
| `s2b.outcome.fixed` / `.fallback` / `.unresolved` | Fixed / Fixed with fallback / Unresolved |
| `s2b.tag.yours` | Your attack |
| `s2b.tag.memory` / `.fallback` | Used memory / Fallback |
| `s2b.panel.attack` | The attack |
| `s2b.panel.where` | Where it appears |
| `s2b.panel.type` | Attack type |
| `s2b.panel.happened` | What happened |
| `s2b.panel.why` | Why it worked |
| `s2b.panel.attempts` | Fix attempts |
| `s2b.attempt` | Attempt {n} |
| `s2b.attempt.accepted` / `.rejected` / `.notverified` | Accepted / Rejected / Not verified |
| `s2b.attempt.origin.llm` / `.memory` / `.fallback` | Written by Antibody / Based on memory / Fallback |
| `s2b.attempt.changes` | What changed |
| `s2b.attempt.whyfix` | Why this fix |
| `s2b.attempt.result` | Result of verification |
| `s2b.attempt.ok` | This fix blocked the attack and no normal task broke. |
| `s2b.panel.memory` | Memory |
| `s2b.diff.h` | Guardrails before and after |
| `s2b.diff.before` / `.after` | Before / After |
| `s2b.diff.rules` / `.tools` / `.filters` | Rules for the model / Tool permissions / Input filters |
| `s2b.diff.added` / `.changed` | added / changed |
| `s2b.diff.none` | No guardrails changed in this run. |
| `s2b.risks.h` | What is still risky |
| `s2b.risks.unres` | Attack {id} could not be fixed: {detail} |
| `s2b.risks.fallback` | Attack classes outside this library were not tested. |
| `s2b.mine.h` | Your attacks |
| `s2b.mine.hit` / `.blocked` / `.error` | Succeeded / Blocked / Errored |
| `s2b.memory.h` | What Antibody remembered |
| `s2b.memory.used` / `.saved` | Used from earlier runs / Saved from this run |
| `s2b.memory.none.used` / `.none.saved` | Nothing was used. / Nothing was saved. |
| `s2b.evidence.h` | Evidence and files |
| `s2b.evidence.trace` | Trace file |
| `s2b.evidence.note` | Every claim in this report links to evidence from this run. |

### 11.4 Explanations, memory, compare

| Key | String |
|---|---|
| `expl.checked.badge` | Evidence checked |
| `expl.unverified.badge` | Unverified explanation |
| `expl.checked.line` | Checked: every piece of evidence below exists in this run. |
| `expl.unverified.body` | This explanation could not be fully checked against the run's evidence. Treat it as a hint, not a fact. |
| `expl.unverified.all` | Show all checks that failed |
| `expl.kind.cause` / `.decision` / `.outcome` / `.risk` | Cause / Decision / Outcome / Risk |
| `expl.by.code` | Generated from run data |
| `expl.by.llm` | Written by Antibody's model |
| `expl.missing` | No explanation was produced for this step. |
| `expl.title.diagnosis` | Why it worked |
| `expl.title.fix` | Why this fix |
| `expl.title.accepted` / `.rejected` | Why it was accepted / Why it was rejected |
| `expl.title.unresolved` | Why it could not be fixed |
| `expl.title.readiness` | Why this verdict |
| `chip.source.*` | per section 4.10 mapping |
| `s3.h` | Fix library |
| `s3.sub` | What Antibody has learned from earlier runs. Newer runs can reuse these fixes. |
| `s3.reset` | Reset memory |
| `s3.cols` | Memory / Learned on / Cause / Attack type / Fix / Trust / Outcome |
| `s3.outcome.verified` / `.unresolved` | Verified / Unresolved |
| `s3.expand.does` / `.why` / `.reuse` | What the fix does / Why it was written / Reuse history |
| `s3.reuse.none` | Not reused yet. |
| `s3.reuse.worked` / `.failed` | Worked / Failed |
| `s3.empty.title` | Nothing learned yet. |
| `s3.empty.body` | Run an automation to start building the fix library. |
| `s3.error.title` / `.body` / `.retry` | Can't load the fix library. / Check that the API is running. / Try again |
| `s3.dialog.title` | Reset memory? |
| `s3.dialog.body` | This deletes everything Antibody has learned. Future runs will start without past fixes. This can't be undone. |
| `s3.dialog.cancel` / `.confirm` / `.confirming` | Cancel / Reset memory / Resetting... |
| `s3.dialog.error` | Couldn't reset memory. Try again. |
| `s3.toast.reset` | Memory reset |
| `s4.h` | Cold vs warm |
| `s4.sub` | Same automation, same attacks, same seed. The only difference is whether Antibody could reuse earlier fixes. |
| `s4.chip.*` | Automation: {name} / Learned from: {name} / Pairs run: {n} / Seed: {n} / Created {time} |
| `s4.pair` | Pair {n} |
| `s4.cols` | Measure / Cold / Warm / Difference |
| `s4.measure.*` | Fix attempts / Fixes accepted on the first try / Fixes rejected / Model calls / Time / Attack success rate after fixes / Unresolved attacks |
| `s4.diff.fewer` / `.more` / `.same` | fewer / more / same |
| `s4.open.cold` / `.warm` | Open cold run / Open warm run |
| `s4.empty.title` / `.body` | No comparison yet. / Run npm run demo:cold-warm to create one. |
| `s4.error` | Couldn't read the comparison file. |
| `s5.title` / `.body` / `.cta` | We can't find that page. / Check the address, or go back to the launcher. / Back to launcher |
| `toast.copied` / `.copyfail` / `.downloaded` | Copied / Couldn't copy. Select the text and copy it yourself. / Report downloaded |

### 11.5 Verification rejection reasons (plain words)

| `reason_code` | Heading | Text (use `details` after the sentence when present) |
|---|---|---|
| `attack_still_hits` | The attack still worked | "After this fix the same attack still succeeded." |
| `prior_fix_broken` | An earlier fix stopped working | "This fix undid protection added earlier." |
| `regression_break` | A normal task broke | "The fix stopped a normal task from working: {tasks}." (task ids in mono tags) |
| `fix_invalid` | The fix was not valid | "The proposed change did not pass Antibody's checks." |
| `duplicate_fix` | The same fix was tried before | "This fix matched an earlier rejected attempt." |

### 11.6 Degraded codes (banner copy)

| Code | Banner text |
|---|---|
| `zetaris_fallback` | Zetaris was unreachable, so the local data store answered the same queries. |
| `memory_unavailable` | The fix library was unavailable, so this run did not use or save fixes. |
| `budget_exhausted` | The run hit its call or time budget, so results may be incomplete. |
| `high_error_rate` | More than 20% of attack runs errored. Treat the numbers with care. |
| `verifier_error` | A verification could not be completed, so some fixes were rejected for safety. |
| `unverified_explanation` | Some explanations could not be fully checked against evidence. They are marked. |
| any other | "Heads up: {code}." (never invent explanations) |

### 11.7 Validation errors in plain words (explanation panel)

Map the leading rule id of each `validation_errors` entry: `V-1` "The explanation had too many or too few claims." ; `V-2` "A claim had no evidence." ; `V-3` "A claim cited evidence that is not part of this run." ; `V-4` "The explanation left out evidence it is required to cite." ; `V-5` "A claim contained a secret value." ; `V-6` "A claim did not match what the judge found." ; `V-7` "A claim named the wrong data source." ; any other: show the raw text.

### 11.8 API errors

| Source | Title | Body |
|---|---|---|
| network failure | Can't reach the Antibody API. | Start it with npm run dev, then try again. |
| `400 invalid_request` | (field-level) | the API `message` |
| `400 unknown_target` | That automation isn't available. | Choose one of the two automations. |
| `422 out_of_scope` | That request is outside the sandbox. | Antibody only attacks sandbox automations. |
| `502 provider_unavailable` | The model provider did not answer. | Antibody tried Nightshift and the NVIDIA fallback. Check that Nightshift is running and your token is set. |
| `500 internal` | Antibody hit an internal error. | Try again. If it keeps happening, check the API logs. |
| `404 unknown_run` | We can't find that run. | (section 11.2) |

---

## 12. Responsive behavior (exact)

| Component | `sm` (< 640) | `md` (640 to 899) | `lg+` (>= 900) |
|---|---|---|---|
| Nav pill | width `calc(100% - 24px)`; wordmark hidden; links share width | auto width | auto width |
| Hero H1 | clamp minimum 40px | scales | up to 76px |
| Target cards | 1 column | 2 columns | 2 columns |
| Number row | stacked (label, stepper, helper) | inline | inline |
| Console footer | helper above, button full width | inline | inline |
| S2 main grid | 1 column; progress plate **above** trace | 1 column; progress above | 2 columns (trace, 320px progress) |
| Stage tracker | horizontal scroll with snap, current stage scrolled into view | fits | fits |
| Trace row | two-line layout (4.9) | full grid with the time column and chevron visible | full grid |
| Metric cards | 1 column | 2 columns | 2 columns at `lg`, 4 at `xl` |
| Findings | stacked cards (disclosure) | stacked cards | table |
| Guardrail diff | stacked | side by side | side by side |
| Readiness plate | medal above text; buttons stacked full width | medal left; buttons inline | same |
| Dialog | full width minus 16px, bottom-anchored with 16px radius | centered | centered |
| Toast | full width minus 32px | auto | auto |

Never hide information at small sizes; reflow it. Code blocks and the tracker scroll inside their containers; the page never scrolls horizontally.

---

## 13. Performance and robustness rules

1. Render at most 500 trace rows; older lines stay in memory and load 200 at a time via "Show earlier lines".
2. Batch SSE updates (section 9.1). Memoize rows by line id.
3. `backdrop-filter` only on the nav pill. The grain texture (L2) only on plates; at most 4 plates carry it per screen. Animated properties: `transform` and `opacity` only (the sheen and scan line move a pseudo element with `transform`, never `background-position` or `filter`). **One exception:** the one-time launcher headline sheen animates `background-position` once.
4. Images: none. Fonts: at most the three families with the listed weights; `font-display: swap`.
5. Every network call has a timeout (10s for GETs, 20s for `POST /run`) and shows the matching error state.
6. Never block rendering on fonts, the grain image or `GET /health`.
7. The report is rendered only from the `Report` JSON; if a field is missing (older report), show "Not available" in mono-neutral text for that item rather than throwing. Unknown enum values render as the raw value in a neutral mono tag.
8. Never log secrets to the console. Never render raw HTML from API strings (React text nodes only; no `dangerouslySetInnerHTML`).

---

## 14. Implementation guide

### 14.1 File map (`DECIDED`)

```
app/
  layout.tsx            # fonts, skip link, nav pill, main, footer, live region, toast host
  page.tsx              # S1
  runs/[traceId]/page.tsx   # S2 + S2b
  memory/page.tsx       # S3
  compare/page.tsx      # S4 (server component reads data/comparison)
  not-found.tsx         # S5
  dev/gallery/page.tsx  # dev only (14.4)
  copy.ts               # every string in section 11, keyed
  lib/
    api.ts              # typed client, timeouts, error mapping (uses src/schemas.ts types)
    useRun.ts           # state machine 9.1
    stage.ts            # mapping 9.2
    evidence.ts         # chip labels 9.3
    labels.ts           # maps 9.4
    format.ts           # formatting 9.5
    recent.ts           # localStorage 2.4
  components/
    icons.tsx Nav.tsx Button.tsx Chip.tsx Badge.tsx Tag.tsx Segmented.tsx Field.tsx NumberStepper.tsx
    TargetCard.tsx MetricCard.tsx StageTracker.tsx TraceRow.tsx TracePanel.tsx ProgressPanel.tsx
    EvidenceChip.tsx ExplanationPanel.tsx ReadinessPlate.tsx Medal.tsx FindingsTable.tsx FindingPanel.tsx
    AttemptCard.tsx GuardrailDiff.tsx Banner.tsx Dialog.tsx Toast.tsx CodeBlock.tsx EmptyBlock.tsx Skeleton.tsx
  styles/
    index.css           # imports in order: tokens, base, metal, layout, components
    tokens.css          # provided (section 3)
    metal.css           # provided (section 3.2, 3.3, 3.8, 3.9)
    base.css            # reset, body, typography classes, focus ring, reduced motion
    layout.css          # container, grids, breakpoints, page header
    components.css      # one block per component (ab-btn, ab-chip, ab-row, ...)
```

### 14.2 CSS rules

1. Plain CSS with BEM class names prefixed `ab-` (`ab-btn`, `ab-btn--primary`, `ab-btn__icon`). **No Tailwind, no CSS-in-JS, no UI library.**
2. All colors, sizes, radii, shadows and durations come from `var(--ab-*)`. No hex or rgb values outside `tokens.css` and `metal.css`.
3. Media queries use the breakpoints in 3.11 (`@media (min-width: 640px)`, `900px`, `1200px`), mobile-first.
4. One component, one block; no descendant selectors reaching into other components.
5. States are classes or ARIA attributes (`[aria-expanded="true"]`, `[aria-checked="true"]`, `.is-loading`); never inline styles for state.
6. Respect `prefers-reduced-motion` globally in `base.css`.

### 14.3 Build levels (so nothing is guessed about scope)

| Level | Contents | Status |
|---|---|---|
| **L1 (mandatory)** | tokens, base, plates with chrome edge (no grain), metal headline text, medal, buttons, chips, badges, tags, fields, segmented control, target cards, nav pill, rows, banners, dialog, toast, code block, empty and error blocks; S1, S2 (trace panel, progress panel, tracker), S2b (all of 8.3 and 8.4), S5 | `DECIDED` |
| **L2 (cut list)** | grain texture; sheen sweep (hover and headline); scan line animation; skeleton shimmer; S3 Fix library; S4 Cold vs warm | cut early (PROJECT_SPEC cut list item 6) |
| **L3 (cut list)** | dev gallery; icon refinement; hover micro-interactions beyond color changes | cut first |

If time is short, ship L1 exactly. Metal-look essentials inside L1: the chrome-edge plates, the metal headline, the gold/silver/bronze medal and readiness plate rim, and the silver stage discs.

### 14.4 Dev gallery and fixtures (the only permitted fixtures)

- `/dev/gallery` exists only when `process.env.NODE_ENV !== "production"`; in production the route returns `notFound()`.
- It renders each component in every state using JSON from `test/contract_examples/` (the examples in `DATA_CONTRACTS.md`).
- Every gallery page shows a fixed banner: "Fixture data. Not a real run."
- Fixtures must never be imported by any file outside `app/dev/` and `test/`. No other screen may show invented data, including during development. If the API is not ready, build against the contract with the gallery.

---

## 15. UI acceptance checklist (run before every UI PR; paste results)

Visual and brand
- [ ] UI-01 Page background `#07080B` with the soft top light; no pure black or pure white surfaces.
- [ ] UI-02 Launcher H1 is two lines; line 1 metal gradient, line 2 dimmer metal; font Outfit 300 (or the fallback).
- [ ] UI-03 Plates have the chrome-edge hairline; rows, fields and inlays follow the four-surface table (3.3) with the specified radii.
- [ ] UI-04 Gold, silver and bronze appear only in the readiness plate rim and medal (verdict), silver stage discs and silver target-card discs.
- [ ] UI-05 Exactly one lime primary button per screen.
- [ ] UI-06 No ALL CAPS text, no emoji, no middle-dot joined meta strings, no arrow glyph on buttons.
- [ ] UI-07 Mono is used only for ids, refs, times, action names, numbers in tables, code.

Behavior
- [ ] UI-08 S1 run button is disabled until an automation is chosen; helper line reads per 11.1.
- [ ] UI-09 Validation messages match 8.1.5 exactly and focus moves to the first invalid field.
- [ ] UI-10 Submit posts `wait:false`, stores the run in `antibody.recent_runs`, navigates to `/runs/{id}`.
- [ ] UI-11 S2 stage tracker follows the mapping in 9.2, including revisited badge and reset of later stages.
- [ ] UI-12 Trace list does not duplicate lines after a reconnect (dedupe by SSE id).
- [ ] UI-13 Pause scrolling, Jump to latest and filters work as in 8.2.4 and 8.2.5, with live counts.
- [ ] UI-14 Rejected, failed and escalated rows have the ember left border; fallback and needs-revision rows have amber.
- [ ] UI-15 Finishing a run shows the banner; auto-scroll happens only if the person is within 200px of the top.
- [ ] UI-16 Readiness plate: correct title, metal rim, medal and summary sentence for each of the three verdicts (test with three fixtures in the gallery).
- [ ] UI-17 Four metric cards show the exact labels, values and footnotes; unresolved above 0 uses the attention variant.
- [ ] UI-18 Findings table expands to the five sections in order; attempt cards show rejections before acceptance; plain-language labels everywhere (no raw enum without its plain label).
- [ ] UI-19 Explanation panels: verified shows "Evidence checked"; unverified shows the warning and the plain-language reason; chips open snippets with correct source labels; `(Zetaris)` vs `(local store)` come only from the ref prefix.
- [ ] UI-20 Guardrail diff marks added items and changed permissions as specified.
- [ ] UI-21 Download produces `antibody-<trace_id>.json` with 2-space indent.
- [ ] UI-22 "Run another automation" opens `/?target=<other>&memory=warm` and S1 preselects both.
- [ ] UI-23 Failure states (F7) each show the specified banner or block and recovery action.
- [ ] UI-24 Memory reset requires the dialog, focuses Cancel, sends `X-Confirm: reset`, shows the toast.

Accessibility
- [ ] UI-25 Keyboard-only run through F1 to F4 works; focus ring visible everywhere.
- [ ] UI-26 Skip link, landmarks, heading hierarchy correct.
- [ ] UI-27 Live region announces stage changes, rejections, finish and failure, at most once per 3 seconds; the trace list is not a live region.
- [ ] UI-28 All text meets contrast; no color-only meaning.
- [ ] UI-29 `prefers-reduced-motion` disables sheen, scan line, fades; layout remains correct.
- [ ] UI-30 Works at 200% zoom and 320px width without page-level horizontal scroll.

Robustness
- [ ] UI-31 Missing or unknown fields render "Not available" or a neutral raw tag, never a crash.
- [ ] UI-32 No `dangerouslySetInnerHTML`; no secrets in console.
- [ ] UI-33 No invented data outside `app/dev/` (grep for fixtures).
- [ ] UI-34 Production build 404s `/dev/gallery`.
- [ ] UI-35 Every string comes from `app/copy.ts` (grep for inline English strings in components).

---

## 16. Contract and API changes this design requires

These are applied to `DATA_CONTRACTS.md` (sections 10, 11) and must be implemented by the API (Ayo, TASKS_ayo T-A5/T-A6).

| # | Change | Why |
|---|---|---|
| 1 | SSE format: `event: trace`, `id: <trace line number, 1-based>`, `data: <TraceLine JSON>`; replay from `Last-Event-ID`; final `event: end` with `data: {"status":"finished"}` or `{"status":"failed"}`; comment heartbeat `: keepalive` every 15s | Dedupe and resume (9.1) |
| 2 | `GET /runs/{id}`: 200 `Report`; 202 `{status:"running", started_at, request, last_trace_line}`; 500 `{status:"failed", error:{code,message}}`; 404 `{error:{code:"unknown_run",message}}`. `POST /run` with `wait:true` failures: 400, 422, 502 `provider_unavailable`, 500 `internal` | Failure states (F7) |
| 3 | `Report.findings[]` gains `attack: Attack` and `hits: Hit[]` | "The attack" and "What happened" (8.3.5) |
| 4 | `Report.metrics` gains `attack_errors: number` and `regression_newly_failing: string[]` | Sentence and metric card 2 |
| 5 | New error code `unknown_run` | 404 above |
| 6 | `Report` gains `request: RunRequest` and `started_at: string` | Run settings in progress panel and "Run again" |
| 7 | New type `ColdWarmComparison` and file `data/comparison/<timestamp>.json` | S4 |
| 8 | `Report` gains `custom_attack_results: { attack_id: string; carrier: Carrier; injection_text: string; verdict: "hit"|"blocked"|"error" }[]` (empty when none) | 8.3.8 |
| 9 | `TraceLine` gains optional `meta?: Record<string, string | number | boolean>`; keys used by the UI: `finding_index`, `findings_total`, `attempt`, `attempts_max`, `queue_left` | Loop chips and queue line |

---

## 17. Do-not list for the coding agent

- Do not add pages, features, filters, charts, themes, animations, icons or copy that are not in this file.
- Do not use a UI kit (shadcn, MUI, Chakra, Tailwind, Radix themes), icon libraries, animation libraries or charting libraries.
- Do not use gradients, shadows or colors that are not tokens. Do not use bright metal gradients outside the places in UI-04.
- Do not rename states, labels or copy. Do not translate enum values on your own; use section 9.4.
- Do not show invented sample data, placeholder names, lorem ipsum or "coming soon" in production screens.
- Do not hide degraded, unverified or unresolved information to make a screen look cleaner.
- Do not make the UI call any service other than the Antibody API (and the Next.js server reading `data/comparison/`).
- If a case is not specified: stop, ask Ayo, and add the answer to this file.

---

## 18. Open questions (all `UNVERIFIED`)

| ID | Question | Default until answered |
|---|---|---|
| D-1 | Do Outfit, Hanken Grotesk and JetBrains Mono load in our environment (`next/font` or Google Fonts)? | Use the fallback stacks; do not block |
| D-2 | Is `backdrop-filter` acceptable on the judges' browsers? | Solid fallback fill is specified in 4.2 |
| D-3 | Official Track 2 wording (README O-1) may want an explicit "Why" entry point on the launcher | Keep as designed; revisit after reading the track text |
| D-4 | Whether the demo will be recorded at 1920x1080 or 1440x900 | Design is checked at 1440x900 and 390x844 |

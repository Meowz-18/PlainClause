# PlainClause — Design Document

**Version:** 1.0
**Scope:** Information architecture, interaction design, visual system, content design, accessibility.
**Companion docs:** `PRD.md` (what and why), `TECH.md` (how).

---

## 1. Design thesis

The dominant pattern for AI document tools is a chat box next to a PDF. It is the wrong shape for this problem, because it requires the user to already know what to ask. Priya doesn't know that her lease is missing a deposit-return deadline — that is precisely why she needs the tool.

**So PlainClause leads with findings, not with a prompt.** The analysis arrives unrequested. Chat exists, but as a follow-up mechanism, not the front door.

Three consequences shape every screen:

1. **The source document is always visible.** Findings are claims about a document; a claim you can't check against the original is worth very little. The reading pane is not a preview, it's the evidence.
2. **Findings are ranked, not listed.** Twelve equally-weighted observations is a wall. Three high-severity findings above the fold, everything else collapsed below.
3. **The tool sounds like a well-informed friend, not a law firm.** The register is plain, specific, and slightly blunt. It never performs authority it doesn't have.

---

## 2. Information architecture

```
/                      Landing + upload
/analyze               Workspace (the product)
  ├─ Findings rail     Risk radar, clause list, missing clauses  [left, primary]
  ├─ Reading pane      Source document w/ clause highlighting    [centre]
  └─ Ask panel         Grounded Q&A                              [right, collapsible]
/compare               Two-document workspace                     [P1]
/about                 What this is, what it isn't, how it works
```

One product surface. No dashboard, no settings page, no onboarding carousel. Configuration that matters (document type override, language, redaction) lives inline where its effect is visible.

---

## 3. Screens

### 3.1 Landing — `/`

A single decision: give us a document.

```
┌──────────────────────────────────────────────────────────┐
│  PlainClause                              About   Theme  │
│                                                          │
│         Read the contract you're about to sign.          │
│                                                          │
│    Upload a rental agreement, offer letter, freelance    │
│    contract or NDA. We'll show you what's in it, what    │
│    isn't, and what to ask about.                         │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │                                                │    │
│   │        Drop a PDF, DOCX or TXT here            │    │
│   │           or  browse   ·   paste text          │    │
│   │                                                │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
│   Try a sample:                                          │
│   [ Mumbai rent agreement ]  [ Offer letter ]            │
│   [ Freelance contract ]                                 │
│                                                          │
│   ─────────────────────────────────────────────────      │
│   🔒 Your document is never stored. It's processed in    │
│      memory and discarded when you close the tab.        │
│                                                          │
│   PlainClause gives you information about your document. │
│   It is not legal advice and not a substitute for a      │
│   lawyer.                                                │
└──────────────────────────────────────────────────────────┘
```

**Design notes**

- **Sample documents are a first-class feature, not filler.** An evaluator with no contract handy must reach a full analysis in one click. Three samples, each demonstrating a different playbook.
- The privacy line sits above the fold because it's the objection that stops people from uploading a contract to a website.
- The information-not-advice line is present but not shouted. It appears again, contextually, where findings render.
- No sign-up. No email capture. No modal.

### 3.2 Workspace — `/analyze`

The main surface. Three columns on desktop, stacked with a segmented control on mobile.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ PlainClause    rent-agreement.pdf  ·  12 pages                   Export ⌄ │
├───────────────────────────────────────────────────────────────────────────┤
│ Residential leave & license · India (Maharashtra) · English   [Change ⌄]  │
├──────────────────────────┬───────────────────────────┬────────────────────┤
│ WHAT TO LOOK AT          │ THE DOCUMENT              │ ASK                │
│                          │                           │                    │
│ ┌──────────────────────┐ │  LEAVE AND LICENSE        │ ┌────────────────┐ │
│ │ ▲ HIGH               │ │  AGREEMENT                │ │ Can he raise   │ │
│ │ No deadline to       │ │                           │ │ the rent mid-  │ │
│ │ return your deposit  │ │  This Agreement is made   │ │ term?          │ │
│ │                      │ │  on the 4th day of...     │ │                │ │
│ │ Clause 7 requires    │ │                           │ │ ───────────    │ │
│ │ ₹1,50,000 but never  │ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │ │ Yes — clause   │ │
│ │ says when you get    │ │  ▓ 7. The Licensee    ▓   │ │ 4.2 allows a   │ │
│ │ it back. Comparable  │ │  ▓ shall deposit an   ▓   │ │ 10% increase   │ │
│ │ agreements say       │ │  ▓ interest-free sum  ▓   │ │ after month 11 │ │
│ │ 15–30 days.          │ │  ▓ of Rs. 1,50,000... ▓   │ │ on 30 days'    │ │
│ │                      │ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │ │ notice.        │ │
│ │ [Show clause 7]      │ │                           │ │                │ │
│ └──────────────────────┘ │  8. The Licensor shall    │ │ ▸ Clause 4.2   │ │
│                          │  be entitled to enter...  │ │                │ │
│ ┌──────────────────────┐ │                           │ └────────────────┘ │
│ │ ▲ HIGH               │ │                           │                    │
│ │ Landlord can enter   │ │                           │ ┌────────────────┐ │
│ │ without notice       │ │                           │ │ Ask about this │ │
│ └──────────────────────┘ │                           │ │ document…      │ │
│                          │                           │ └────────────────┘ │
│ ┌──────────────────────┐ │                           │                    │
│ │ ◆ MEDIUM  ×4      ⌄ │ │                           │ Suggested:         │
│ └──────────────────────┘ │                           │ · What happens if  │
│ ┌──────────────────────┐ │                           │   I leave early?   │
│ │ ● LOW  ×7         ⌄ │ │                           │ · Who pays for     │
│ └──────────────────────┘ │                           │   repairs?         │
│                          │                           │                    │
│ ─── WHAT'S NOT IN IT ─── │                           │                    │
│ ○ No deposit-return      │                           │                    │
│   timeline               │                           │                    │
│ ○ No maintenance         │                           │                    │
│   responsibility split   │                           │                    │
│ ○ No lock-in exit terms  │                           │                    │
│                          │                           │                    │
│ ─────────────────────────│                           │                    │
│ ℹ Information, not legal │                           │                    │
│   advice. [Why?]         │                           │                    │
└──────────────────────────┴───────────────────────────┴────────────────────┘
```

**Interaction rules**

| Behaviour | Rule |
|---|---|
| **Progressive reveal** | The reading pane renders as soon as parsing completes, before analysis starts. The user is never looking at a spinner on an empty page. |
| **Streaming findings** | Finding cards appear one at a time as they resolve, highest severity first where possible. A skeleton card with a subtle shimmer marks work in progress. `aria-live="polite"` announces counts, not each card (see §7). |
| **Bidirectional linking** | Clicking a finding scrolls the reading pane to the clause and applies a highlight. Clicking a highlighted clause in the document scrolls the rail to its finding. Both directions are keyboard-reachable. |
| **Severity grouping** | High findings expanded by default. Medium and Low collapsed into count-labelled groups. |
| **Missing clauses** | A visually distinct section with an outlined (not filled) marker — the visual grammar says *absence*. |
| **Document type override** | The triage banner is editable. Changing type re-runs analysis with the new playbook, with a confirm step since it discards current findings. |
| **Failure containment** | A failed clause batch renders an inline card: "Couldn't analyse clauses 12–18. [Retry]". The rest of the analysis stands. |

### 3.3 Finding card anatomy

The atomic unit of the product. Every element earns its place.

```
┌────────────────────────────────────────────┐
│ ▲ HIGH          Deposit & security         │   severity icon + text + category
│                                            │
│ No deadline to return your deposit         │   ← the finding, in ≤8 words
│                                            │
│ Clause 7 requires a ₹1,50,000 interest-    │   ← what it says (plain language)
│ free deposit but never states when it      │
│ must be returned after you move out.       │
│                                            │
│ ⚖ Comparable agreements usually specify    │   ← what's normal (playbook)
│   15–30 days from handover.                │
│                                            │
│ → Ask for a return deadline and a written  │   ← what you could do
│   list of permitted deductions.            │
│                                            │
│ [Show clause 7]            [Add to asks]   │
└────────────────────────────────────────────┘
```

The four-beat structure — **what it says → why it matters → what's normal → what you could do** — is what turns a summary into something useful. "What you could do" is phrased as an option to raise, never as a recommendation to act.

### 3.4 Compare — `/compare` (P1)

Two documents, one findings rail. Changes are classified by **materiality**, not just textual difference:

- **Significant** — shifts risk, money, or a right (notice period 30 → 90 days).
- **Meaningful** — changes an obligation without shifting risk much.
- **Cosmetic** — renumbering, formatting, defined-term changes.

Cosmetic changes are collapsed by default. A plain diff would bury the one change that matters under forty whitespace edits; the materiality judgement is the entire value of the feature.

### 3.5 Lawyer prep pack (P1)

A print-optimised single page, generated on demand:

1. **Situation** — document type, parties, key commercial terms, one paragraph.
2. **The five questions worth asking** — ranked, specific, each tied to a clause.
3. **Clauses to bring** — numbered references with excerpts.
4. **What I've already checked** — so the user isn't billed for ground already covered.

This is the product's clearest statement of its own role: it makes the lawyer conversation cheaper and better, rather than pretending to replace it.

---

## 4. Visual system

The aim is a tool that feels like a careful, serious instrument — closer to a good text editor than to a consumer AI app. Restrained, typographic, dense where density helps.

### 4.1 Type

| Role | Family | Notes |
|---|---|---|
| **UI & findings** | Inter (variable) | Tight, legible at small sizes |
| **Document pane** | Source Serif 4 | Serif for long-form reading; visually separates the user's document from our interface |
| **Numerals, offsets** | `ui-monospace` tabular | Clause numbers, page refs |

Scale: 12 / 14 / 16 / 20 / 28 / 40. Body copy 16px minimum. Document pane offers a three-step size control (16 / 18 / 21px) — a small feature that disproportionately improves accessibility.

### 4.2 Colour

Light and dark themes, both driven by CSS custom properties on `:root` so the whole palette is one file.

```
Surface        #FAFAF8   /  #16161A     warm off-white, not pure white
Surface raised #FFFFFF   /  #1E1E23
Text primary   #1A1A1E   /  #ECECEF
Text secondary #5A5A63   /  #9A9AA3
Border         #E3E3DE   /  #2E2E35
Accent (ink)   #1F4E5F   /  #7FB5C5     deep teal — links, focus, active
High           #A4262C   /  #FF8A85
Medium         #A66300   /  #F0B65B
Low            #3F6E4C   /  #83C99A
Absent         #5A5A63   /  #9A9AA3     outlined markers for missing clauses
Highlight      #FFF3C4   /  #4A4021     clause highlight in document pane
```

**Severity is never communicated by colour alone.** Each tier carries a distinct glyph *and* a text label:

| Tier | Glyph | Label |
|---|---|---|
| High | ▲ filled triangle | `HIGH` |
| Medium | ◆ filled diamond | `MEDIUM` |
| Low | ● filled circle | `LOW` |
| Missing | ○ hollow circle | `NOT IN DOCUMENT` |

Tested against deuteranopia, protanopia, and greyscale.

### 4.3 Layout & motion

- 4px spacing base. Workspace grid: `380px | 1fr | 340px`, collapsing to a single column with a segmented control below 1024px.
- Content max-width in the document pane: 68ch.
- Motion is functional only: a 150ms fade for arriving cards, a 300ms smooth scroll for clause navigation, a shimmer on skeletons. All of it disabled under `prefers-reduced-motion: reduce`, with instant state changes substituted — never simply removed.
- No decorative illustration, no gradient hero, no floating orbs. The seriousness of the subject is the aesthetic.

---

## 5. Content design

Voice is the product. A finding written badly is worse than no finding.

### 5.1 Rules

1. **Lead with the consequence, not the clause.** "You could lose your deposit with no recourse" before "Clause 7 states…".
2. **Second person.** "You must give 90 days' notice," not "The Licensee shall provide."
3. **Numbers stay concrete.** ₹1,50,000 and 90 days, not "a substantial sum" and "an extended period."
4. **No hedging theatre.** "This clause probably might potentially be unfavourable" communicates nothing. Either it's a finding or it isn't. Genuine uncertainty gets a confidence indicator, not mushy prose.
5. **No legal jargon without a gloss.** First use of *indemnify*, *liquidated damages*, *force majeure* carries an inline definition on hover/focus and in a glossary.
6. **Options, never instructions.** "You could ask for…" / "Some agreements include…" — never "You should refuse to sign."
7. **Short.** Finding title ≤8 words. Explanation ≤2 sentences.

### 5.2 Worked examples

| ✗ Weak | ✓ Strong |
|---|---|
| "This clause may be unfavourable to the tenant." | "The landlord can keep your full deposit for any damage he decides isn't normal wear — with no appeal and no itemised list." |
| "The agreement contains a non-compete provision." | "For 18 months after you leave, this bars you from working anywhere in the same industry. Post-employment restraints like this are generally void under s.27 of the Indian Contract Act — worth asking about." |
| "Consult a lawyer for more information." | "This one's worth 15 minutes with a lawyer. We've drafted the exact question to ask — [see prep pack]." |

### 5.3 The boundary, in practice

When a user asks for advice, the product does not refuse and stop. It converts.

> **User:** "Should I sign this?"
>
> **PlainClause:** "I can't tell you that — it depends on things I can't see, like your alternatives and how much you want this flat. What I can do is lay out the decision.
>
> **Two things would cost you real money if they went wrong:** the deposit with no return deadline (clause 7), and the landlord's unrestricted entry right (clause 8).
>
> **Three things are negotiable and commonly changed:** [...]
>
> **One thing you'd want a lawyer's view on:** whether the lock-in penalty in clause 11 is enforceable given it isn't tied to actual loss.
>
> Want me to draft the asks, or put together a page you could take to a lawyer?"

That response is the whole product philosophy in one screen.

---

## 6. Empty, loading, and error states

| State | Design |
|---|---|
| **Parsing** | Skeleton document with a determinate progress bar. Page count announced when known. |
| **Analysing** | Reading pane fully interactive. Rail shows skeleton cards with a live count: "Analysed 14 of 31 clauses." |
| **Image-only PDF** | "This PDF has no selectable text — it's probably a scan or a photo. We can't read it. You can paste the text instead, or try a text-based copy." With a paste box directly below. Never a generic error. |
| **Batch failure** | Inline card scoped to the affected clause range, with a retry. Other findings unaffected. |
| **Model unavailable** | Banner: "Analysis is down right now. You can still read and search your document." The reading pane stays fully usable. |
| **No findings above Low** | Not framed as failure: "Nothing here looks unusual for a freelance agreement. Here's what it commits you to." followed by the obligations list. |
| **Rate limited** | Plain explanation with a countdown, and a note that the current analysis is preserved. |

---

## 7. Accessibility

Treated as a design requirement with a test, not a checklist item. Target: **WCAG 2.2 AA**.

### 7.1 Structure & keyboard

- Semantic landmarks: `<header>`, `<nav>`, `<main>`, three `<section>`s with `aria-labelledby`.
- Findings rail is a `<ul>` of articles, not a div soup. Each finding is a real `<article>` with an `<h3>` title.
- Skip links: *Skip to findings*, *Skip to document*, *Skip to ask*.
- Every action keyboard-reachable in a logical order. Custom controls implement full WAI-ARIA keyboard patterns (arrow keys within the findings list, `Esc` to dismiss).
- Focus is never trapped except in true modals, which return focus to the invoking element on close.
- Focus indicator: 2px accent outline with 2px offset, meeting 3:1 against both adjacent colours. Never `outline: none`.

### 7.2 Streaming and live regions

The hardest accessibility problem here. A naive `aria-live` on a streaming list produces continuous unusable chatter.

**Approach:**
- The findings container is `aria-live="polite" aria-relevant="additions"` but announces a **debounced summary**, not each card: "3 findings so far" → "7 findings, analysis complete."
- Streamed answer text in the Ask panel is written to an off-screen live region only on completion; during streaming, a status element announces "Answering."
- A `role="status"` element carries phase changes: parsing → analysing → complete.

### 7.3 Content accessibility

- Risk conveyed by glyph + label + colour (§4.2).
- All contrast ≥4.5:1 for text, ≥3:1 for UI components and graphics.
- Clause highlights in the document pane use `<mark>` with an accessible name, not a background colour on a `<span>`.
- Citation links carry descriptive accessible names: "Show clause 7, deposit and security" — not "here."
- Plain-language output is the default, with a reading-level control (Plain / Simpler) and language selection (English / हिन्दी / मराठी).
- Layout reflows to 320px CSS width with no horizontal scrolling; text scales to 200% without loss of function.
- Target size ≥24×24px (WCAG 2.2 SC 2.5.8).
- No time limits anywhere.

### 7.4 Verification

- `@axe-core/playwright` assertions on landing, workspace (loading, streaming, complete, error), and compare. CI fails on `serious` or `critical`.
- Manual keyboard-only traversal of the full Priya journey, documented in `docs/a11y-audit.md`.
- Screen reader spot check: VoiceOver/Safari and NVDA/Firefox.

---

## 8. Responsive behaviour

| Breakpoint | Layout |
|---|---|
| **≥1280px** | Three columns. Ask panel open by default. |
| **1024–1279px** | Three columns, Ask panel collapsed to a rail tab. |
| **768–1023px** | Two columns (findings + document); Ask as a bottom sheet. |
| **<768px** | Single column with a segmented control: `Findings · Document · Ask`. Findings is the default tab. Finding cards are full-width; "Show clause" switches tabs and scrolls. Sticky bottom bar holds the ask input. |

Mobile is not a degraded desktop. On a phone the user is most likely standing in a flat about to sign something, so the default tab is Findings and the first card is the highest-severity one.

---

## 9. Design decisions and their tradeoffs

| Decision | Chosen because | Cost accepted |
|---|---|---|
| Findings-first, not chat-first | Users don't know what to ask | Higher up-front cost and latency per document |
| Source document always visible | Verifiability is the product's credibility | Loses horizontal space; hard on mobile |
| No persistence, no accounts | Privacy is the adoption blocker; also a faster build | No history; refresh loses state |
| Curated playbooks over pure model knowledge | Testable, auditable, consistent; drives real context-based logic | Manual curation; limited doc-type coverage |
| Severity grouping with collapse | Prevents wall-of-text paralysis | Users may never expand Low findings |
| Materiality judgement in compare | A raw diff buries the one change that matters | An extra model call; judgement can be wrong |
| Samples on the landing page | Evaluator reaches value in one click | Maintenance of fixture documents |

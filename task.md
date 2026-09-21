# PlainClause — Tasks

## Phase 1 — Skeleton & Deterministic Core (Complete)

### Project Skeleton
- [x] Initialize Next.js 16 + TypeScript strict
- [x] Configure Tailwind v4, PostCSS
- [x] Configure ESLint, Prettier
- [x] Configure Vitest
- [x] Configure Playwright (`playwright.config.ts`)
- [x] Create `.env.example`, `.gitignore`
- [x] Create CI workflow (`.github/workflows/ci.yml`)
- [x] Create `docs/DECISIONS.md`

### Domain Layer (`lib/`)
- [x] `lib/types.ts` — Zod schemas + derived types
- [x] `lib/constants.ts` — Named constants, error codes, model IDs
- [x] `lib/parse/normalize.ts` — Text normalisation
- [x] `lib/parse/pdf.ts` — PDF text extraction via unpdf
- [x] `lib/parse/docx.ts` — DOCX text extraction via mammoth
- [x] `lib/parse/detect.ts` — MIME sniffing, scanned-PDF detection
- [x] `lib/parse/index.ts` — Parse dispatcher
- [x] `lib/segment/heuristics.ts` — Five ordered heuristics
- [x] `lib/segment/segment.ts` — Orchestrator with merge/split
- [x] `lib/redact/patterns.ts` — PII regex patterns
- [x] `lib/redact/redact.ts` — Reversible tokenisation

### API Routes (Phase 1)
- [x] `app/api/parse/route.ts` — Parse endpoint (multipart + json)
- [x] `app/api/sample/route.ts` — Sample fixture endpoint for 1-click evaluation

### UI Components (Phase 1)
- [x] `app/globals.css` — Theme tokens, CSS custom properties, responsive grid
- [x] `app/layout.tsx` — Root layout with fonts, skip links, meta
- [x] `app/page.tsx` — Landing page
- [x] `app/analyze/page.tsx` — Workspace shell
- [x] `app/about/page.tsx` — About page
- [x] `components/upload/` — UploadZone, PasteInput, SampleButtons
- [x] `components/document/` — DocumentPane, ClauseBlock
- [x] `components/findings/` — FindingsRail, FindingCard, SkeletonCard, MissingSection
- [x] `components/ui/` — SeverityBadge, ThemeToggle, Header, Banner
- [x] `components/a11y/` — SkipLinks, LiveRegion, StatusAnnouncer
- [x] `store/document-store.ts` — Zustand store

---

## Phase 2 — Playbooks & Analysis Engine (Complete)

### Playbook System (`lib/playbooks/`)
- [x] `lib/playbooks/schema.ts` — PlaybookSchema Zod schema (TECH.md §4.1)
- [x] `lib/playbooks/rental-in.ts` — Residential lease playbook (Maharashtra/India)
- [x] `lib/playbooks/employment-in.ts` — Employment agreement playbook (India)
- [x] `lib/playbooks/generic.ts` — Generic fallback playbook
- [x] `lib/playbooks/index.ts` — Playbook registry & resolver

### AI Pipeline (`lib/ai/`)
- [x] `lib/ai/client.ts` — Anthropic SDK singleton with retry, timeout & abort
- [x] `lib/ai/models.ts` — Model IDs and selection map
- [x] `lib/ai/prompts/system.ts` — Shared constitution verbatim from TECH.md §7.1
- [x] `lib/ai/prompts/triage.ts` — Triage prompt template
- [x] `lib/ai/prompts/analyze.ts` — Clause analysis prompt template
- [x] `lib/ai/schemas.ts` — Output Zod schemas
- [x] `lib/ai/pipeline.ts` — Batching, concurrency, map-reduce, SSE generator, offline heuristics
- [x] `lib/ai/validate.ts` — Offset, citation & confidence validation, hallucination filter
- [x] `lib/ai/missing.ts` — Deterministic missing protections detector

### API Routes (Phase 2)
- [x] `app/api/triage/route.ts` — Haiku document triage with fallback
- [x] `app/api/analyze/route.ts` — Streamed SSE clause analysis

### Components (Phase 2)
- [x] `components/findings/TriageBanner.tsx` — Document type & jurisdiction override
- [x] `components/findings/RiskRadar.tsx` — Above-the-fold risk index & top risks
- [x] Wire streaming client into `app/analyze/page.tsx`

---

## Phase 3 — Grounded Q&A & Safety Guardrails (Complete)

### Safety System (`lib/safety/`)
- [x] `lib/safety/resources.ts` — Emergency & legal aid resources by jurisdiction (NALSA 15100, 112, 181, DLSA)
- [x] `lib/safety/injection.ts` — Prompt injection pre-scan & XML delimiter sanitization
- [x] `lib/safety/intent.ts` — 5-way intent classifier with safety bias

### Q&A Engine & Prompts
- [x] `lib/ai/prompts/ask.ts` — Constitutional Q&A prompt with quote limits
- [x] `app/api/ask/route.ts` — SSE grounded Q&A stream with citation pills

### Q&A UI
- [x] `components/ask/AskPanel.tsx` — Grounded chat panel with interactive citation pills
- [x] Bidirectional highlight linking: clicking citation pills highlights and scrolls DocumentPane
- [x] Emergency Support Notice card displayed when urgent distress detected

---

## Phase 4 — Exporting & Artifact Generation (Complete)

### Export Engine (`lib/export/`)
- [x] `lib/export/markdown.ts` — Portable Markdown analysis export
- [x] `lib/export/prep-pack.ts` — Advocate / legal counsel briefing pack
- [x] `lib/export/ics.ts` — iCalendar obligation & deadline exporter
- [x] `app/api/generate/route.ts` — Artifact generation endpoint (report, counsel pack, checklist, negotiation email)
- [x] `components/findings/ExportButtons.tsx` — 1-click export actions in FindingsRail

---

## Verification & Status Summary
- [x] **Unit Tests (`vitest`)**: 76 / 76 tests passing across 7 test files
- [x] **ESLint (`next lint`)**: 0 errors, 0 warnings across all code
- [x] **TypeScript (`tsc`)**: Strict type check cleanly passed
- [x] **Next.js Production Build (`next build`)**: Clean build with static & dynamic routes
- [x] **Live Browser Verification**: Full workflow verified with Microsoft Edge via Playwright

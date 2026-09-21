# PlainClause

> **Read the contract you're about to sign.**

PlainClause is an AI-powered legal document comprehension tool built for people who encounter law not in a courtroom but in a PDF — a rent agreement, an offer letter, a freelance contract. It surfaces what's unusual, what standard protections are missing, and what to ask about, with every finding anchored to the exact clause in your document.

**This is not legal advice.** PlainClause provides information and document analysis. It does not tell you whether to sign, predict outcomes, or substitute for a qualified advocate.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Clause-Level Analysis** | Every clause gets a plain-language summary, risk tier (high / medium / low), party bias, and market-norm comparison |
| **Risk Radar** | Top 3–5 critical findings surfaced above the fold with severity and "why this matters to you" |
| **Missing-Clause Detection** | Compares against curated playbooks to flag absent protections (e.g., deposit return deadline, inspection notice) |
| **Grounded Q&A** | Ask questions about the document — answers stream with inline clause citations that scroll to the source text |
| **Safety Routing** | Intent classifier detects urgent distress, advice-seeking, prompt injection, and off-topic queries — each gets a distinct, safe response |
| **PII Redaction** | PAN, Aadhaar, phone, and email are auto-masked before any model call (on by default, reversible) |
| **Export Suite** | Markdown report, `.ics` obligations calendar, lawyer prep pack, and negotiation email — all with timestamps and disclaimers |
| **Dark / Light Theme** | Full dual-theme system with `prefers-color-scheme` auto-detection |
| **Zero Retention** | No document is stored server-side. All processing is in volatile memory. Tab close = permanent deletion |

---

## 🏗️ Architecture

```
app/                    Next.js 16 App Router
├── page.tsx            Landing — upload / paste / sample
├── analyze/page.tsx    Workspace — 3-column grid (Findings · Document · Ask)
├── about/page.tsx      Product explainer
└── api/
    ├── parse/          File ingestion (PDF, DOCX, TXT, paste)
    ├── triage/         Document classification (type, jurisdiction, language)
    ├── analyze/        SSE streamed clause analysis with playbook grounding
    ├── ask/            Grounded Q&A with citation extraction
    ├── generate/       Export artifacts (report, prep pack, .ics, email)
    └── sample/         1-click demo fixture loader

lib/
├── ai/                AI pipeline — batching, validation, prompt templates
├── playbooks/         Curated playbooks (rental-IN, employment-IN, generic)
├── safety/            Intent classifier, injection scanner, emergency resources
├── segment/           Deterministic clause segmenter (5 heuristics)
├── parse/             PDF/DOCX extraction, MIME detection
├── redact/            PII tokenisation (regex-based, reversible)
└── export/            Markdown, ICS, lawyer prep pack generators

components/
├── findings/          FindingsRail, FindingCard, RiskRadar, MissingSection, ExportButtons
├── document/          DocumentPane, ClauseBlock
├── ask/               AskPanel (streaming chat with citation pills)
├── upload/            UploadZone, PasteInput, SampleButtons
├── a11y/              SkipLinks, LiveRegion, StatusAnnouncer
└── ui/                SeverityBadge, ThemeToggle, Header, Banner
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10

### Setup

```bash
# Clone and install
git clone <repo-url>
cd plainclause
npm install

# Configure environment
cp .env.example .env.local
# Add your API key(s) in .env.local:
#   GROQ_API_KEY=gsk_...          (primary)
#   ANTHROPIC_API_KEY=sk-ant-...  (optional fallback)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — click **"Try a sample"** to load a fixture contract instantly.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (if using AI) | Groq API key for LLM inference |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key (failover) |

> Without API keys, the app degrades gracefully to **deterministic heuristic analysis** using domain-specific pattern matching. All core features (segmentation, missing-clause detection, risk scoring) work offline.

---

## 🧪 Testing

```bash
# Unit tests (76+ tests across 7 suites)
npm test

# Type checking
npm run typecheck

# Lint
npm run lint

# E2E & accessibility tests
npm run test:e2e

# Production build verification
npm run build
```

### Test Coverage

| Suite | Tests | Validates |
|---|---|---|
| `segment.test.ts` | 12 | Five-heuristic clause segmentation |
| `normalize.test.ts` | 10 | Text normalisation pipeline |
| `redact.test.ts` | 9 | PII detection & reversible tokenisation |
| `safety.test.ts` | 15 | 5-way intent classifier, injection defence, emergency resources |
| `validate.test.ts` | 6 | Phantom clause filtering, confidence floor, playbook enrichment |
| `missing.test.ts` | 5 | Missing-clause detection against playbook requirements |
| `recall.test.ts` | 10 | Missing-clause recall across 10 fixture contracts (≥80% target) |
| `playbooks.test.ts` | 9 | Playbook schema validation & registry resolution |

---

## 📋 Playbooks

PlainClause ships with three curated playbooks:

1. **Residential Leave & License (Maharashtra, India)** — Maharashtra Rent Control Act, 1999; Model Tenancy Act, 2021
2. **Employment Agreement (India)** — s.27 Indian Contract Act (non-compete void); s.74 (training bonds)
3. **Commercial Agreement (Generic Fallback)** — Baseline analysis for NDAs, consulting agreements, and unclassified contracts

Playbooks are static, reviewable assets with `lastReviewed` dates and primary-source citations. They are never generated by the model at runtime.

---

## 🛡️ Safety & Privacy

- **Intent Router**: Every user message is classified into `document_question`, `general_legal_info`, `advice_seeking`, `urgent_situation`, or `off_topic` — each with a distinct handler
- **Prompt Injection Defence**: Document content is XML-delimited as untrusted input; injection patterns are pre-scanned and neutralised
- **Emergency Resources**: Urgent distress triggers surface NALSA (15100), Women Helpline (181), and state legal aid contacts
- **No Server Storage**: Zero-retention architecture. No database, no analytics receiving document content
- **CSP & Secrets**: All model calls are server-side. No API keys in the client bundle

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| AI Providers | Groq (primary), Anthropic (failover) |
| Validation | Zod v4 |
| PDF Parsing | unpdf |
| DOCX Parsing | mammoth |
| Testing | Vitest (unit), Playwright (E2E), axe-core (accessibility) |
| CI | GitHub Actions |
| Deployment | Vercel |

---

## 📖 Documentation

- [`PRD.md`](./PRD.md) — Product Requirements Document
- [`TECH.md`](./TECH.md) — Technical Architecture Specification
- [`DESIGN.md`](./DESIGN.md) — Design Document (IA, interaction, visual system, accessibility)
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architecture Decision Records

---

## ⚖️ Disclaimer

PlainClause provides document comprehension and information. It is **not legal advice** and is **not a substitute for a qualified legal professional**. Where a lawyer is needed, PlainClause helps make the handoff cheaper — not substitute for it. Always consult a licensed advocate for decisions with legal consequences.

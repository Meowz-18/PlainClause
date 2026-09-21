# PlainClause — Product Requirements Document

**Version:** 1.0
**Status:** Approved for hackathon build
**Vertical:** Legal — Accessible Legal Information & Document Understanding
**Tagline:** *Read the contract you're about to sign.*

---

## 1. Problem

Most people encounter law not in a courtroom but in a PDF: a rent agreement, an offer letter, a freelance contract, a loan sanction letter, a terms-of-service page. These documents are drafted by one party, for that party, and handed to the other side with an implicit "sign here."

The person signing typically cannot answer three basic questions:

1. **What am I agreeing to?** The language is deliberately dense and the important terms are buried mid-paragraph.
2. **Is this normal?** Without having seen fifty similar contracts, there is no baseline. An unusual clause looks identical to a boilerplate one.
3. **What's missing?** Absent protections are invisible. A lease with no deposit-return timeline reads perfectly fine until you try to get your deposit back.

A lawyer answers all three in twenty minutes. But for a ₹25,000/month rental agreement or a ₹60,000 freelance project, paying for that review is economically irrational, so almost nobody does it. The result is a large population signing documents they have not understood, discovering the terms only when something goes wrong.

**PlainClause closes the gap between "I can't afford a lawyer for this" and "so I'll just sign it."**

---

## 2. Target user

### Primary persona — Priya, 26, product designer, Mumbai

Freelances alongside a full-time job. In the last year she has signed a leave-and-license agreement for a flat in Andheri, an employment contract with a 90-day notice period and a non-compete, and four client SOWs. She read none of them properly. She is comfortable with software, is not intimidated by legal language so much as bored and defeated by it, and would happily spend five minutes if the tool actually told her something.

**What she needs:** to know the three things in this document that could hurt her, in language she understands, with the exact sentence highlighted so she can verify it herself.

**What she does not need:** a summary that says "this is a standard rental agreement."

### Secondary personas

| Persona | Document | Core need |
|---|---|---|
| **Arjun, 23, first job** | Employment offer letter | Is this notice period / bond / non-compete enforceable? |
| **Meena, 41, runs a 6-person studio** | Client MSA, vendor contracts | Compare two versions; what changed in v3? |
| **Rahul, 34, tenant renewing** | Old lease vs. new lease | What did the landlord quietly change? |

### Explicit non-user

Lawyers doing professional review. PlainClause is not a practice tool, does not attempt legal research, and does not compete with CLM software. Where a lawyer is needed, the product's job is to make the handoff cheaper — not to substitute for it.

---

## 3. Product principles

1. **Ground everything or say nothing.** Every finding points to a specific clause in the user's document. If the answer isn't in the document, the product says so rather than filling the gap from general knowledge.
2. **Information, never advice.** The product explains what a clause does and what is typical. It does not tell the user whether to sign, predict case outcomes, or recommend a legal strategy. This is a hard boundary enforced in code and prompts, not a footer disclaimer.
3. **Absence is a finding.** What the contract *doesn't* say is treated as first-class output alongside what it does.
4. **The user should end up more capable, not more dependent.** Outputs are designed to be taken somewhere — a negotiation email, a question list for a lawyer, a checklist before signing.
5. **The document is the user's, not ours.** Nothing is stored server-side. Privacy is an architectural property, not a policy promise.
6. **Legible confidence.** When the model is unsure, the UI shows it. Silent confident wrongness is the worst failure mode in this domain.

---

## 4. Scope

### 4.1 P0 — Must ship (core demo)

| ID | Capability | Acceptance criteria |
|---|---|---|
| **P0-1** | **Ingest** PDF, DOCX, TXT, or pasted text | ≤10 MB, ≤60 pages. Parse errors produce a readable message and a paste-text fallback, never a blank screen. |
| **P0-2** | **Clause segmentation** | Document split into addressable clauses with stable IDs and character offsets back into the source text. Deterministic, no model call. |
| **P0-3** | **Triage** | Classify document type (rental / employment / freelance-services / NDA / loan / ToS / other), jurisdiction, and language, with a confidence score. User can override the detected type. |
| **P0-4** | **Clause-level analysis** | For each clause: plain-language summary (≤2 sentences), category, risk tier (low / medium / high), which party it favours, and a one-line reason. Rendered as a scannable list linked to the highlighted source text. |
| **P0-5** | **Risk radar** | Top 3–5 findings surfaced above the fold with severity, plain explanation, and "why this matters to you." |
| **P0-6** | **Missing-clause detection** | Compare against the playbook's required-clause list; report protections that are absent. |
| **P0-7** | **Grounded Q&A** | Ask a question about the document; get a streamed answer with inline clause citations that scroll the document to the cited text. Out-of-document questions get an explicit "this isn't covered in your document" response. |
| **P0-8** | **Safety routing** | Requests for legal advice, or signals of an urgent legal situation, are detected and routed to an information-and-resources response rather than an advisory one. |
| **P0-9** | **Accessibility** | WCAG 2.2 AA on the core flow: keyboard-operable, screen-reader-announced streaming, risk never conveyed by colour alone. |

### 4.2 P1 — Strongly desired (differentiators)

| ID | Capability |
|---|---|
| **P1-1** | **Obligations & dates extractor** — every deadline, notice period, renewal window, and payment obligation as a dated checklist, exportable as `.ics`. |
| **P1-2** | **Lawyer prep pack** — a one-page brief: facts, the five questions worth paying for, and the clauses to bring. Directly serves the "prepare for a legal professional" use case. |
| **P1-3** | **Negotiation draft** — turns the top findings into a polite, specific counterproposal email with suggested replacement language. |
| **P1-4** | **Document compare** — two versions side by side, with a *materiality* judgement per change (cosmetic / meaningful / significant), not just a text diff. |
| **P1-5** | **Jurisdiction notes** — flags clauses whose enforceability is doubtful in the detected jurisdiction (e.g. post-employment non-competes under s.27, Indian Contract Act, 1872). |
| **P1-6** | **Reading-level and language toggle** — plain English / simpler English / Hindi / Marathi output. |

### 4.3 P2 — Stretch

- Saved matters with Supabase auth + RLS (see Tech Doc §11).
- Clause library: "show me how this clause usually reads."
- Voice input for Q&A.
- Shareable read-only analysis link with an expiry.

### 4.4 Explicit non-goals

- No legal advice, outcome prediction, or "should I sign this" verdicts.
- No document *generation* from scratch — no contract drafting.
- No e-signature, no filing, no submission to any authority.
- No case-law research or statute search.
- No claim of jurisdictional completeness. The product covers India (Maharashtra defaults) well and degrades to generic analysis elsewhere, and says so.
- No storage of user documents in the MVP.

---

## 5. User journeys

### Journey A — "I'm about to sign a lease" (primary demo path)

1. Priya lands on the home screen and drops in `rent-agreement-final.pdf`.
2. Parsing and segmentation complete locally on the server in <2s; the document renders in the reading pane immediately, before any analysis.
3. A triage banner appears: *"Looks like a residential leave-and-license agreement, India (Maharashtra). Not right? Change it."*
4. Findings stream into the left rail as they're produced — she doesn't wait for the whole document.
5. The top finding reads: **High — Deposit return has no deadline.** *Clause 7 requires a ₹1,50,000 deposit but never says when it must be returned. Comparable agreements specify 15–30 days from handover.* She clicks it; clause 7 highlights in the reading pane.
6. She asks: *"Can he increase the rent mid-term?"* The answer cites clause 4.2 and quotes the escalation trigger.
7. She exports the **negotiation draft** — three specific asks with replacement wording — and sends it to the landlord.

**Total time: under four minutes. She has read her lease.**

### Journey B — "Two offers, which is worse?"

Arjun uploads offer letters from two companies, selects Compare, and gets a side-by-side of notice period, bond, non-compete scope, IP assignment, and termination — with a flag that Company B's 18-month non-compete is likely unenforceable as a post-employment restraint in India, and a note that the ₹2,00,000 training bond's enforceability depends on demonstrable actual training cost.

### Journey C — "Something has gone wrong"

A user types *"my landlord is locking me out tomorrow, what do I do."* The intent router classifies this as urgent-situation rather than document-question. The response does **not** improvise a legal strategy. It surfaces: what the document says about lockout/re-entry (clause citation), that forcible eviction without due process is generally not permitted, and concrete routes to real help — legal aid services authority, tenant helplines, and how to find a local advocate. It then offers the lawyer prep pack.

**This journey is a scored feature, not an edge case.** Handling it well is the clearest demonstration that the system knows the limits of its own authority.

---

## 6. Functional requirements

### 6.1 Ingestion
- **FR-1.1** Accept `.pdf`, `.docx`, `.txt`, `.md`, and pasted text.
- **FR-1.2** Reject files >10 MB or >60 pages with a specific, actionable message.
- **FR-1.3** Detect scanned/image-only PDFs (no extractable text layer) and tell the user plainly, offering the paste fallback. Do not fail silently with an empty analysis.
- **FR-1.4** Detect and offer to redact personal identifiers (Aadhaar-format numbers, PAN, phone, email, bank account, addresses) before any model call. Redaction is on by default and reversible in the UI.

### 6.2 Analysis
- **FR-2.1** Every finding carries `clauseId` and character offsets that resolve to real text in the source. Findings that fail offset validation are dropped, not displayed.
- **FR-2.2** Risk tiers are defined and consistently applied: **High** = material financial exposure, one-sided termination/liability, or loss of a legal right. **Medium** = unfavourable but negotiable and common. **Low** = worth knowing, standard.
- **FR-2.3** Missing-clause findings are labelled distinctly from present-clause findings.
- **FR-2.4** Analysis is resumable and partial-tolerant: if one clause batch fails, the rest still render, with a visible retry for the failed section.
- **FR-2.5** Documents exceeding the single-pass budget are analysed in batches with a map-reduce summary. Degradation is graceful and disclosed.

### 6.3 Q&A
- **FR-3.1** Answers cite clauses. An answer with no citation must state that it is general context, not something found in the document.
- **FR-3.2** If the document does not address the question, say so and suggest what to ask the other party.
- **FR-3.3** Conversation history is retained within the session and cleared on document change.

### 6.4 Safety
- **FR-4.1** Every user message passes an intent classification: `document_question`, `general_legal_info`, `advice_seeking`, `urgent_situation`, `off_topic`. Each has a distinct handler.
- **FR-4.2** `advice_seeking` responses reframe to information plus options, and offer the lawyer prep pack.
- **FR-4.3** `urgent_situation` responses lead with help resources.
- **FR-4.4** Document text is treated as untrusted input. Instructions embedded in an uploaded document must never alter system behaviour. (See Tech Doc §9.2.)
- **FR-4.5** A persistent, non-dismissible indicator states that PlainClause provides information, not legal advice. It appears in-context near findings, not only in the footer.

### 6.5 Output
- **FR-5.1** Findings exportable as Markdown and PDF.
- **FR-5.2** Obligations exportable as `.ics`.
- **FR-5.3** All exports carry the source document name, analysis timestamp, model version, and the information-not-advice notice.

---

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Document visible in reading pane <2s after upload. First finding streamed <6s. Full analysis of a 15-page contract <35s. |
| **Availability** | Degrades to read-only document view if the model API is unavailable; never a white screen. |
| **Privacy** | No document content persisted server-side in MVP. No third-party analytics receive document content. Zero-retention posture stated on the landing page. |
| **Security** | No secrets in client bundle. All model calls server-side. Rate limited per IP. Strict CSP. Uploads never executed or rendered as HTML. |
| **Efficiency** | Cheap model for triage, capable model for analysis. Prompt caching on playbooks. Bounded concurrency. Hard token budget per document with a pre-flight estimate shown to the user. |
| **Accessibility** | WCAG 2.2 AA. Full keyboard operability. `prefers-reduced-motion` respected. Text scalable to 200% without loss of function. Automated axe checks in CI. |
| **Browser support** | Evergreen Chrome, Safari, Firefox, Edge. Responsive to 375px. |

---

## 8. Success metrics

Because this is a hackathon build, metrics are defined as demonstrable properties rather than post-launch analytics.

| Metric | Target |
|---|---|
| **Citation validity** | ≥98% of displayed findings resolve to correct source offsets (measured by an automated offset-validation test over the fixture corpus). |
| **Missing-clause recall** | On 10 fixture contracts with known removed clauses, ≥80% of removals detected. |
| **Refusal correctness** | 100% of the 15-case adversarial prompt suite (advice-seeking, injection, off-topic, urgent) routed to the correct handler. |
| **Time to first finding** | <6s on a 15-page PDF. |
| **Cost per document** | <$0.10 for a 15-page contract under default settings. |
| **Accessibility** | Zero axe-core violations of `serious` or `critical` severity on all primary screens. |

---

## 9. Assumptions

1. Users are non-lawyers with adequate functional literacy, reading contracts drafted by the other side.
2. Documents are text-based. OCR is out of scope; image-only PDFs are detected and declined with a fallback path.
3. Documents are predominantly English, with India as the default jurisdiction. Output can be translated; analysis quality is highest for English source text.
4. Typical documents are 2–30 pages. The 60-page ceiling is a guardrail, not a design target.
5. A single user session concerns one or two documents; no portfolio management.
6. The legal reference content in playbooks (norms, jurisdiction notes, enforceability flags) is curated, cited, and **verified against primary sources before demo**. It is a static, reviewable asset — not model-generated at runtime — precisely so that it can be audited.
7. Users accept a browser session lasting the duration of their review; losing state on refresh is an acceptable MVP tradeoff given the privacy benefit.
8. The evaluator will run the deployed link without an account. No sign-up wall in the MVP.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Model asserts a confident wrong reading of a clause | High — user relies on it | Mandatory citation + offset validation; side-by-side source text so the user can verify in one glance; confidence surfaced in UI |
| Product drifts into giving legal advice | High — harm and credibility | Intent router, prompt constraints, adversarial test suite in CI, advice-seeking reframed to options |
| Prompt injection via uploaded document | Medium — unpredictable output | Untrusted-data delimiting, instruction-ignoring system prompt, schema-validated output, injection cases in test suite |
| Jurisdiction content is wrong or outdated | High — actively misleading | Curated playbooks with source citations and a `lastReviewed` date; flagged as informational; no statutory claims generated at runtime |
| Long documents blow latency and cost | Medium — bad demo | Batching, concurrency limits, pre-flight token estimate, streaming so perceived latency stays low |
| Scope creep across P0/P1/P2 | High — nothing ships | P0 is frozen. P1 items are individually cuttable. P2 is explicitly optional. |

---

## 11. Build sequence

| Phase | Deliverable | Gate |
|---|---|---|
| **1** | Repo, CI, upload → parse → segment → render. No AI. | A PDF renders with addressable clauses. |
| **2** | Playbooks for rental + employment. Triage + clause analysis + risk radar, streaming. | Priya's journey works end to end. |
| **3** | Grounded Q&A, intent router, safety handlers. | Adversarial suite passes. |
| **4** | Missing-clause detection, obligations, lawyer prep pack. | P1 core complete. |
| **5** | Accessibility pass, test coverage, README, deploy. | axe clean, tests green, Vercel live. |
| **6** | *If time:* compare mode, negotiation draft, translation. | — |

**Cut order if time runs short:** compare mode → negotiation draft → translation → obligations export → lawyer prep pack. Never cut: citations, intent router, accessibility.

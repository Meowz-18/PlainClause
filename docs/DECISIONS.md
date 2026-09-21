# PlainClause — Design Decisions

Decisions made where the spec was silent or ambiguous. One line each.

| # | Decision | Rationale |
|---|---|---|
| 1 | PII redaction runs server-side on extracted text before model calls, not literally client-side pre-upload | File parsing requires server-side extraction; "client-side" intent is that the model never sees real PII. Token map returned to client for UI restoration. |
| 2 | Using Tailwind CSS v4 (CSS-first `@theme` config, no JS config file) | v4 is current (Sep 2026), lighter, better CSS custom property integration for the dual-theme system. |
| 3 | PDF export deferred; Markdown export covers the use case | PDF generation requires a heavy dependency (puppeteer/react-pdf). Markdown is portable and complete. |
| 4 | `file-type` used via dynamic import in route handlers | v19 is ESM-only; dynamic import avoids bundler issues with Next.js server components. |
| 5 | Next.js 16 used instead of 15 | create-next-app installed v16 as latest stable. Same App Router architecture, API-compatible. Noted as deviation from TECH.md header. |
| 6 | `unpdf` page offset: `page` field on Clause is `null` when page boundaries cannot be reliably determined | unpdf may not expose page-level character offsets in all cases. UI degrades gracefully (no page number shown). |
| 7 | Font loading via `next/font/google` for self-hosting | Avoids external requests, good for CSP and privacy. Font files not checked into repo. |
| 8 | `app/api/sample` added as server route serving fixture contracts | Enables evaluator 1-click sample document loading from landing page per DESIGN.md §3.1. |
| 9 | `ThemeProvider` initializes theme via lazy state callback | Avoids synchronous setState inside useEffect, eliminating cascading renders while persisting to localStorage. |
| 10 | `app/analyze/page.tsx` manages AbortController per effect mount and reads `triage` from store state | Eliminates React Strict Mode unmount abortion lockout and conforms to React 19 hook purity rules. |
| 11 | Intent classifier enforces strict safety bias for emergencies (NALSA 15100, 112, 181) | Ensures users facing urgent lock-outs, threats, or abuse immediately receive statutory legal aid resources before document text. |
| 12 | Offline deterministic heuristics use domain-specific legal pattern matching | Allows full standalone evaluation and fixture demo execution without requiring an active Anthropic API key. |
| 13 | Groq SDK added as primary LLM provider with Anthropic as fallback | Groq provides faster inference for the streaming UX; Anthropic remains for quality-sensitive analysis. Provider selection is automatic based on configured env vars. |
| 14 | SSE (Server-Sent Events) chosen over WebSockets for analysis streaming | Simpler server model (stateless HTTP), better compatibility with edge/serverless (Vercel), and no need for bidirectional communication in this use case. |
| 15 | Zustand for client state over React Context or Redux | Minimal boilerplate, supports subscriptions with selectors (no wasted re-renders), and works seamlessly with Next.js App Router and React 19. |
| 16 | 10-fixture recall corpus created with known clause omissions per playbook requirement | Enables automated measurement of PRD §8 success metric (≥80% missing-clause recall) as a CI-enforced regression gate. |
| 17 | Playwright E2E with axe-core added to CI pipeline | Ensures accessibility regressions are caught before merge. Runs against Chromium only in CI for speed; full matrix (5 browsers) available locally. |
| 18 | Legal notice placed as `role="note"` inside FindingsRail, not in page footer | FR-4.5 requires "in-context near findings, not only in the footer." Persistent and non-dismissible — not inside a collapsible section. |

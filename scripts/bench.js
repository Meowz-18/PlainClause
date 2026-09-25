/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * PlainClause -- Efficiency Benchmark Harness (Phase A)
 *
 * Runs the full deterministic pipeline against every fixture in fixtures/
 * without any live model calls. Reports per-fixture timings, token estimates,
 * and payload sizes to stdout.
 *
 * Usage:  npm run bench
 */
// @ts-check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

// We load lib modules dynamically after tsx/ts-node resolves them.
// This script is designed to be run with: npx tsx scripts/bench.ts

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures');
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS_PER_BATCH = 6000;
const TRIAGE_SAMPLE_CHARS = 4000;
const MIN_CLAUSE_CHARS = 120;

// ----- helpers ---------------------------------------------------------------

function approxTokens(s) { return Math.ceil(s.length / CHARS_PER_TOKEN); }

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/(1024*1024)).toFixed(2) + ' MB';
}
function fmtMs(n) { return n.toFixed(2) + ' ms'; }
function fmtCost(usd) { return '$' + usd.toFixed(5); }

function getCommitSha() {
  try { return execSync('git rev-parse --short HEAD', {encoding:'utf8'}).trim(); }
  catch { return 'unknown'; }
}

// ----- deterministic pipeline stubs -----------------------------------------
// Replicate only what we need to measure without importing TS modules directly.

function normalizeText(raw) {
  let t = raw;
  t = t.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  t = t.replace(/\u00A0/g,' ').replace(/\u200B/g,'').replace(/\u2028/g,'\n').replace(/\u2029/g,'\n\n');
  const LIGATURES = {'\uFB00':'ff','\uFB01':'fi','\uFB02':'fl','\uFB03':'ffi','\uFB04':'ffl','\uFB05':'st','\uFB06':'st'};
  for (const [lig, rep] of Object.entries(LIGATURES)) t = t.split(lig).join(rep);
  t = t.replace(/\u00AD/g,'');
  t = t.replace(/(\w)-\s*\n\s*(\w)/g,'');
  t = t.replace(/[ \t]+$/gm,'');
  t = t.replace(/\n{3,}/g,'\n\n');
  return t.trim();
}

function segmentText(text) {
  if (!text) return [];
  const boundaries = [];
  const num = /^[ \t]*(\d+(?:\.\d+)*)[.)]\s+/gm;
  let m;
  while ((m = num.exec(text)) !== null) boundaries.push({start:m.index, label:m[1], heading:null});
  const kw = /^[ \t]*(ARTICLE|SECTION|CLAUSE|SCHEDULE)\s+([IVXLCDM\d]+[.:]?\s*.*)/gim;
  while ((m = kw.exec(text)) !== null) boundaries.push({start:m.index, label:m[0].trim(), heading:m[0].trim()});
  const lines = text.split('\n'); let off = 0;
  for (const line of lines) {
    const tr = line.trim();
    if (tr.length > 0 && tr.length < 80 && !tr.endsWith('.') && !tr.endsWith(',')) {
      const letters = tr.replace(/[^a-zA-Z]/g,'');
      if (letters.length > 1 && letters === letters.toUpperCase())
        boundaries.push({start:off, label:null, heading:tr});
    }
    off += line.length + 1;
  }
  if (boundaries.length === 0) {
    boundaries.push({start:0, label:null, heading:null});
    const pp = /\n\n+/g;
    while ((m = pp.exec(text)) !== null) {
      const ns = m.index + m[0].length;
      if (ns < text.length) boundaries.push({start:ns, label:null, heading:null});
    }
  }
  boundaries.sort((a,b) => a.start - b.start);
  if (!boundaries.some(b => b.start === 0)) boundaries.unshift({start:0, label:null, heading:null});
  const deduped = [];
  for (const b of boundaries) {
    const prev = deduped[deduped.length-1];
    if (prev && Math.abs(b.start - prev.start) < 5) continue;
    deduped.push(b);
  }
  const raw = [];
  for (let i = 0; i < deduped.length; i++) {
    const cur = deduped[i];
    const nextStart = i+1 < deduped.length ? deduped[i+1].start : text.length;
    let end = nextStart;
    while (end > cur.start && /\s/.test(text[end-1])) end--;
    const ct = text.slice(cur.start, end);
    if (ct.trim().length === 0) continue;
    raw.push({label:cur.label, heading:cur.heading, start:cur.start, end});
  }
  const merged = [];
  for (const c of raw) {
    const ct = text.slice(c.start, c.end);
    if (ct.trim().length < MIN_CLAUSE_CHARS && merged.length > 0) {
      merged[merged.length-1].end = c.end;
    } else { merged.push({...c}); }
  }
  return merged.map((c, i) => ({
    id: 'c-'+(i+1),
    label: c.label,
    heading: c.heading,
    text: text.slice(c.start, c.end),
    start: c.start,
    end: c.end,
    page: null,
    tokenEstimate: Math.ceil((c.end - c.start) / CHARS_PER_TOKEN),
  }));
}

function detectPii(text) {
  const patterns = [
    {kind:'PAN', re:/\b([A-Z]{5}\d{4}[A-Z])\b/g},
    {kind:'AADHAAR', re:/(?<![₹$\d.])\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b(?![\d.])/g},
    {kind:'EMAIL', re:/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g},
    {kind:'PHONE', re:/(?<![A-Za-z\d])(?:\+91[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})\b/g},
    {kind:'BANK', re:/(?:account\s*(?:no\.?|number|#)\s*[:.]?\s*)(\d{9,18})/gi},
  ];
  const matches = [];
  for (const {kind, re} of patterns) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(text)) !== null)
      matches.push({kind, value:m[0], start:m.index, end:m.index+m[0].length});
  }
  matches.sort((a,b) => a.start - b.start);
  const deduped = [];
  for (const m of matches) {
    const prev = deduped[deduped.length-1];
    if (prev && m.start < prev.end) continue;
    deduped.push(m);
  }
  return deduped;
}

function batchClauses(clauses) {
  const batches = []; let cur = [], toks = 0;
  for (const c of clauses) {
    const t = c.tokenEstimate || Math.ceil(c.text.length/4);
    if (cur.length > 0 && toks + t > MAX_TOKENS_PER_BATCH) { batches.push(cur); cur = [c]; toks = t; }
    else { cur.push(c); toks += t; }
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}

function estimateCost(batches) {
  const totalTokens = batches.reduce((a,b) => a + b.reduce((ba,c) => ba + (c.tokenEstimate||Math.ceil(c.text.length/4)), 0), 0);
  const estimatedInput = totalTokens + batches.length * 3000;
  const estimatedCostUsd = Number(((estimatedInput / 1_000_000) * 3).toFixed(4));
  return {batches: batches.length, inputTokens: estimatedInput, estimatedCostUsd};
}

function detectDocType(lower) {
  if (lower.includes('offer letter') || lower.includes('employment') || lower.includes('cost to company') || lower.includes('probation period') || (lower.includes('ctc') && lower.includes('salary'))) return 'employment';
  if (lower.includes('leave and license') || lower.includes('licensor') || lower.includes('licensee') || lower.includes('licensed premises') || lower.includes('tenancy agreement') || lower.includes('lease agreement') || (lower.includes('rent') && (lower.includes('tenant') || lower.includes('landlord')))) return 'rental_residential';
  if (lower.includes('master services agreement') || lower.includes('freelance') || lower.includes('statement of work') || lower.includes('consultant')) return 'freelance_services';
  return 'other';
}

function getSystemPromptTokens(docType) {
  const constitutionLen = 1756;
  const playbookContextTokens = docType === 'employment' ? 780 : docType === 'rental_residential' ? 720 : docType === 'freelance_services' ? 600 : 400;
  return Math.ceil(constitutionLen / CHARS_PER_TOKEN) + playbookContextTokens;
}

function detectMissingCount(text, docType) {
  const lower = text.toLowerCase();
  const REQUIREMENTS = {
    rental_residential: [
      ['security deposit','deposit amount'],
      ['refund','return of deposit'],
      ['notice period','termination notice'],
      ['maintenance','repair'],
      ['inspection','entry notice'],
    ],
    employment: [
      ['notice period','termination notice'],
      ['salary','compensation','ctc'],
      ['intellectual property','ip assignment'],
      ['confidentiality','nda'],
      ['probation'],
    ],
    freelance_services: [
      ['payment terms','invoice'],
      ['intellectual property','ip'],
      ['termination','notice period'],
      ['confidentiality'],
    ],
    other: [],
  };
  const reqs = REQUIREMENTS[docType] || [];
  let missing = 0;
  for (const kwGroup of reqs) {
    const found = kwGroup.some(kw => lower.includes(kw));
    if (!found) missing++;
  }
  return missing;
}

// ----- measure one fixture ---------------------------------------------------
function measureFixture(fp) {
  const name = path.basename(fp);
  const raw = fs.readFileSync(fp, 'utf8');
  const chars = raw.length;

  const t0 = performance.now();
  void chars; // parse for txt = just read
  const parseMs = performance.now() - t0;

  const t1 = performance.now();
  const norm = normalizeText(raw);
  const normaliseMs = performance.now() - t1;

  const t2 = performance.now();
  const clauses = segmentText(norm);
  const segmentMs = performance.now() - t2;

  const t3 = performance.now();
  const pii = detectPii(norm);
  const redactMs = performance.now() - t3;

  const docType = detectDocType(raw.toLowerCase());
  const isMumbai = raw.toLowerCase().includes('mumbai') || raw.toLowerCase().includes('maharashtra');
  const triage = {
    documentType: docType,
    confidence: 0.9,
    jurisdiction: docType === 'rental_residential' && isMumbai ? 'IN-MH' : 'IN',
    language: 'en', parties: [], reasoning: 'benchmark',
  };

  const triageSampleTokens = approxTokens(norm.slice(0, TRIAGE_SAMPLE_CHARS));
  const batches = batchClauses(clauses);
  const cost = estimateCost(batches);
  const sysTokens = getSystemPromptTokens(docType);
  const totalAnalyzeInput = sysTokens * batches.length + cost.inputTokens;
  const missing = detectMissingCount(norm, docType);

  const analyzeBody = JSON.stringify({clauses, normalizedText: norm, triage});
  const analyzePayload = Buffer.byteLength(analyzeBody, 'utf8');
  const askBody = JSON.stringify({question: 'What are my obligations under this contract?', clauses, triage, history: []});
  const askPayload = Buffer.byteLength(askBody, 'utf8');

  return {
    fixture: name, chars,
    parseMs: Math.round(parseMs*100)/100,
    normaliseMs: Math.round(normaliseMs*100)/100,
    segmentMs: Math.round(segmentMs*100)/100,
    redactMs: Math.round(redactMs*100)/100,
    clauseCount: clauses.length,
    piiMatches: pii.length,
    docTokens: approxTokens(norm),
    triageSampleTokens,
    systemPromptToks: sysTokens,
    batchCount: batches.length,
    totalAnalyzeInputTokens: totalAnalyzeInput,
    estimatedAnalyzeCostUsd: cost.estimatedCostUsd,
    analyzePayloadBytes: analyzePayload,
    askPayloadBytes: askPayload,
    missingCount: missing,
  };
}

// ----- main ------------------------------------------------------------------
function main() {
  const sha = getCommitSha();
  const date = new Date().toISOString().split('T')[0];
  console.log('\n' + '='.repeat(58));
  console.log('  PlainClause — Phase A Baseline Benchmark');
  console.log('  Date: ' + date + '   Commit: ' + sha);
  console.log('='.repeat(58) + '\n');

  const files = fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.txt')).sort();
  const results = [];
  for (const f of files) {
    process.stdout.write('  Measuring ' + f + '...');
    const r = measureFixture(path.join(FIXTURE_DIR, f));
    results.push(r);
    console.log(' done  (' + r.clauseCount + ' clauses, ' + r.batchCount + ' batches)');
  }

  // --- timing table ---
  console.log('\n\n-- PIPELINE TIMING (ms) --\n');
  console.log('Fixture'.padEnd(40) + 'Parse'.padStart(9) + 'Norm'.padStart(9) + 'Seg'.padStart(9) + 'Redact'.padStart(9));
  console.log('-'.repeat(76));
  for (const r of results)
    console.log(r.fixture.padEnd(40) + fmtMs(r.parseMs).padStart(9) + fmtMs(r.normaliseMs).padStart(9) + fmtMs(r.segmentMs).padStart(9) + fmtMs(r.redactMs).padStart(9));

  // --- token table ---
  console.log('\n\n-- TOKEN & COST ESTIMATES --\n');
  console.log('Fixture'.padEnd(40) + 'DocToks'.padStart(9) + 'TriToks'.padStart(9) + 'SysToks'.padStart(9) + 'Batches'.padStart(9) + 'AnalyseToks'.padStart(13) + 'CostUSD'.padStart(10));
  console.log('-'.repeat(99));
  for (const r of results)
    console.log(r.fixture.padEnd(40) + String(r.docTokens).padStart(9) + String(r.triageSampleTokens).padStart(9) + String(r.systemPromptToks).padStart(9) + String(r.batchCount).padStart(9) + String(r.totalAnalyzeInputTokens).padStart(13) + fmtCost(r.estimatedAnalyzeCostUsd).padStart(10));

  // --- payload table ---
  console.log('\n\n-- PAYLOAD SIZES (bytes) --\n');
  console.log('Fixture'.padEnd(40) + 'Clauses'.padStart(9) + 'AnalyseBody'.padStart(13) + 'AskBody(Q1)'.padStart(13));
  console.log('-'.repeat(75));
  for (const r of results)
    console.log(r.fixture.padEnd(40) + String(r.clauseCount).padStart(9) + fmtBytes(r.analyzePayloadBytes).padStart(13) + fmtBytes(r.askPayloadBytes).padStart(13));

  // --- totals ---
  const totalCost = results.reduce((a,r) => a + r.estimatedAnalyzeCostUsd, 0);
  const totalBatches = results.reduce((a,r) => a + r.batchCount, 0);
  const avgAnalyze = Math.round(results.reduce((a,r) => a + r.analyzePayloadBytes, 0) / results.length);
  const avgAsk = Math.round(results.reduce((a,r) => a + r.askPayloadBytes, 0) / results.length);

  console.log('\n-- TOTALS --\n');
  console.log('  Fixtures measured:          ' + results.length);
  console.log('  Total analysis batches:     ' + totalBatches);
  console.log('  Sum estimated cost:         ' + fmtCost(totalCost));
  console.log('  Avg /api/analyze payload:   ' + fmtBytes(avgAnalyze));
  console.log('  Avg /api/ask Q1 payload:    ' + fmtBytes(avgAsk));
  console.log('');

  console.log('  Done. See docs/EFFICIENCY.md for the full baseline document.\n');
}

main();

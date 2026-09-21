/**
 * Parse dispatcher — the entry point for document ingestion.
 *
 * Routes to the correct extractor based on MIME type, normalises text,
 * detects scanned PDFs, and runs segmentation. Returns a complete
 * ParsedDocument ready for analysis.
 *
 * Assumes: input has already been size-validated at the route boundary.
 */
import { normalizeText } from './normalize';
import { extractPdfText } from './pdf';
import { extractDocxText } from './docx';
import { detectMimeType, isAcceptedMimeType, hasTextLayer } from './detect';
import { segmentText } from '@/lib/segment/segment';
import { detectAndRedact } from '@/lib/redact/redact';
import { ERROR_CODE, MAX_PAGE_COUNT } from '@/lib/constants';
import type { ParsedDocument } from '@/lib/types';

/** Structured parse error with a machine-readable code. */
export class ParseError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export interface ParseOptions {
  filename?: string;
  redact?: boolean;
}

/**
 * Parse a document from a binary buffer.
 *
 * Detects format, extracts text, normalises, segments into clauses,
 * optionally redacts PII, and returns a complete ParsedDocument.
 *
 * Throws ParseError with typed error codes for all failure paths.
 */
export async function parseDocument(
  buffer: Uint8Array,
  options: ParseOptions = {},
): Promise<ParsedDocument> {
  const { filename, redact = true } = options;

  // 1. Detect MIME type via magic bytes
  const mime = await detectMimeType(buffer, filename);
  if (!mime || !isAcceptedMimeType(mime)) {
    throw new ParseError(
      ERROR_CODE.UNSUPPORTED_TYPE,
      `Unsupported file type${mime ? `: ${mime}` : ''}. Accepted: PDF, DOCX, TXT, MD.`,
    );
  }

  // 2. Extract raw text
  let rawText: string;
  let pageCount: number | null = null;
  let textLayerPresent = true;

  if (mime === 'application/pdf') {
    const pdf = await extractPdfText(buffer);
    rawText = pdf.text;
    pageCount = pdf.pageCount;
    textLayerPresent = hasTextLayer(rawText);

    if (!textLayerPresent) {
      throw new ParseError(
        ERROR_CODE.NO_TEXT_LAYER,
        'This PDF has no selectable text — it\'s probably a scan or a photo. You can paste the text instead, or try a text-based copy.',
        'paste_fallback',
      );
    }

    if (pageCount > MAX_PAGE_COUNT) {
      throw new ParseError(
        ERROR_CODE.TOO_MANY_PAGES,
        `This document has ${pageCount} pages. We support up to ${MAX_PAGE_COUNT} pages.`,
      );
    }
  } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    rawText = await extractDocxText(Buffer.from(buffer));
  } else {
    // text/plain or text/markdown
    rawText = new TextDecoder('utf-8').decode(buffer);
  }

  // 3. Normalise text
  const normalizedText = normalizeText(rawText);

  if (normalizedText.length === 0) {
    throw new ParseError(
      ERROR_CODE.PARSE_FAILED,
      'Could not extract any text from this document.',
      'paste_fallback',
    );
  }

  // 4. Segment into clauses
  const clauses = segmentText(normalizedText);

  // 5. Optionally redact PII
  const { text: finalText, redactions } = redact
    ? detectAndRedact(normalizedText)
    : { text: normalizedText, redactions: [] };

  // Update clause texts if redaction changed the text
  const finalClauses = redactions.length > 0
    ? clauses.map(c => ({
        ...c,
        text: finalText.slice(c.start, c.end),
      }))
    : clauses;

  return {
    filename: filename ?? 'untitled',
    mimeType: mime,
    normalizedText: finalText,
    clauses: finalClauses,
    pageCount,
    charCount: finalText.length,
    hasTextLayer: textLayerPresent,
    redactions,
  };
}

/**
 * Parse a document from pasted plain text.
 *
 * Simplified path — no MIME detection needed, no binary parsing.
 */
export async function parseText(
  text: string,
  filename?: string,
): Promise<ParsedDocument> {
  const normalizedText = normalizeText(text);

  if (normalizedText.length === 0) {
    throw new ParseError(
      ERROR_CODE.PARSE_FAILED,
      'The pasted text appears to be empty.',
    );
  }

  const clauses = segmentText(normalizedText);
  const { text: finalText, redactions } = detectAndRedact(normalizedText);

  const finalClauses = redactions.length > 0
    ? clauses.map(c => ({
        ...c,
        text: finalText.slice(c.start, c.end),
      }))
    : clauses;

  return {
    filename: filename ?? 'pasted-text',
    mimeType: 'text/plain',
    normalizedText: finalText,
    clauses: finalClauses,
    pageCount: null,
    charCount: finalText.length,
    hasTextLayer: true,
    redactions,
  };
}

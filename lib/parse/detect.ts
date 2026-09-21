/**
 * Format detection and scanned-PDF checks.
 *
 * Uses magic-byte sniffing via file-type for MIME detection (not extension trust).
 * Detects scanned/image-only PDFs by checking if extracted text is negligible.
 *
 * Assumes: file-type is ESM-only, imported dynamically.
 */
import { ACCEPTED_MIME_TYPES } from '@/lib/constants';

/** Minimum characters to consider a PDF as having a text layer. */
const MIN_TEXT_LAYER_CHARS = 50;

/**
 * Detect MIME type from buffer using magic bytes.
 *
 * Falls back to the provided hint if magic-byte detection fails.
 * Assumes: the buffer contains enough bytes for magic-byte detection.
 */
export async function detectMimeType(
  buffer: Uint8Array,
  filenameHint?: string,
): Promise<string | null> {
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);
  if (result) {
    return result.mime;
  }
  // Fallback: check file extension from the hint
  if (filenameHint) {
    const ext = filenameHint.toLowerCase().split('.').pop();
    const extMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    };
    return extMap[ext ?? ''] ?? null;
  }
  return null;
}

/**
 * Check whether a detected MIME type is in our accepted list.
 *
 * Assumes: ACCEPTED_MIME_TYPES is exhaustive.
 */
export function isAcceptedMimeType(mime: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Detect whether a PDF's extracted text indicates a scanned/image-only document.
 *
 * Returns true if the PDF has a real text layer, false if it appears to be
 * image-only (scanned). The threshold is deliberately low — even a partially
 * OCR'd document should be accepted.
 *
 * Assumes: text has already been extracted and normalised.
 */
export function hasTextLayer(extractedText: string): boolean {
  const stripped = extractedText.replace(/\s/g, '');
  return stripped.length >= MIN_TEXT_LAYER_CHARS;
}

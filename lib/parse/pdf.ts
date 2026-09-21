/**
 * PDF text extraction via unpdf.
 *
 * Extracts text content and page count from PDF buffers. Does NOT do OCR.
 * Scanned/image-only PDFs will return empty text, detected by the caller.
 *
 * Assumes: input is a valid PDF buffer (MIME type already verified).
 */
import { getDocumentProxy, extractText } from 'unpdf';

export interface PdfExtraction {
  text: string;
  pageCount: number;
}

/**
 * Extract text from a PDF buffer.
 *
 * Returns raw extracted text (before normalisation) and the page count.
 * An image-only PDF will return an empty or near-empty text string.
 */
export async function extractPdfText(buffer: Uint8Array): Promise<PdfExtraction> {
  const doc = await getDocumentProxy(buffer);
  const result = await extractText(doc, { mergePages: true });
  const rawText = Array.isArray(result.text)
    ? (result.text as string[]).join('\n\n')
    : typeof result.text === 'string'
    ? result.text
    : '';
  return {
    text: rawText,
    pageCount: result.totalPages,
  };
}

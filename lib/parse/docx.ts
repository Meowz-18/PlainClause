/**
 * DOCX text extraction via mammoth.
 *
 * Extracts raw text content from DOCX buffers.
 * Uses mammoth's extractRawText to avoid HTML intermediary.
 *
 * Assumes: input is a valid DOCX buffer (MIME type already verified).
 */
import mammoth from 'mammoth';

/**
 * Extract text from a DOCX buffer.
 *
 * Returns raw extracted text (before normalisation).
 * Page count is not available from DOCX format — returns null.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

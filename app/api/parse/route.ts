/**
 * POST /api/parse — Document parsing endpoint.
 *
 * Thin adapter: validate input → call lib/parse → return ParsedDocument or typed error.
 * Accepts multipart/form-data (file upload) or application/json (pasted text).
 * No model calls. Returns the full parsed document to the client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, parseText, ParseError } from '@/lib/parse/index';
import { MAX_FILE_SIZE_BYTES, ERROR_CODE, ACCEPTED_EXTENSIONS } from '@/lib/constants';

export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return await handleTextInput(request, startTime);
    }

    if (contentType.includes('multipart/form-data')) {
      return await handleFileUpload(request, startTime);
    }

    return NextResponse.json(
      { error: ERROR_CODE.UNSUPPORTED_TYPE, message: 'Expected multipart/form-data or application/json' },
      { status: 415 },
    );
  } catch (error) {
    return handleError(error, startTime);
  }
}

/** Handle pasted text input. */
async function handleTextInput(
  request: NextRequest,
  startTime: number,
): Promise<NextResponse> {
  const body: unknown = await request.json();

  if (!body || typeof body !== 'object' || !('text' in body)) {
    return NextResponse.json(
      { error: ERROR_CODE.VALIDATION_FAILED, message: 'Missing "text" field' },
      { status: 400 },
    );
  }

  const { text, filename } = body as { text: string; filename?: string };

  if (typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json(
      { error: ERROR_CODE.VALIDATION_FAILED, message: 'Text must be a non-empty string' },
      { status: 400 },
    );
  }

  const parsed = await parseText(text, filename);
  logParse(startTime, parsed.clauses.length, parsed.charCount);
  return NextResponse.json(parsed);
}

/** Handle file upload via multipart form data. */
async function handleFileUpload(
  request: NextRequest,
  startTime: number,
): Promise<NextResponse> {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: ERROR_CODE.VALIDATION_FAILED, message: 'No file provided' },
      { status: 400 },
    );
  }

  // Size cap before buffering
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: ERROR_CODE.FILE_TOO_LARGE, limit: '10MB', message: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 10MB.` },
      { status: 413 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const parsed = await parseDocument(buffer, { filename: file.name });
  logParse(startTime, parsed.clauses.length, parsed.charCount);
  return NextResponse.json(parsed);
}

/** Handle parse errors with typed error codes. */
function handleError(error: unknown, startTime: number): NextResponse {
  const duration = Date.now() - startTime;

  if (error instanceof ParseError) {
    const status =
      error.code === ERROR_CODE.FILE_TOO_LARGE ? 413 :
      error.code === ERROR_CODE.NO_TEXT_LAYER ? 422 :
      error.code === ERROR_CODE.UNSUPPORTED_TYPE ? 415 :
      error.code === ERROR_CODE.TOO_MANY_PAGES ? 413 :
      400;

    logRouteEvent('parse', duration, error.code);

    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        ...(error.hint ? { hint: error.hint } : {}),
        ...(error.code === ERROR_CODE.UNSUPPORTED_TYPE
          ? { accepted: [...ACCEPTED_EXTENSIONS] }
          : {}),
      },
      { status },
    );
  }

  logRouteEvent('parse', duration, ERROR_CODE.INTERNAL);

  // Stack traces never cross the network boundary
  return NextResponse.json(
    { error: ERROR_CODE.INTERNAL, message: 'Failed to parse document' },
    { status: 500 },
  );
}

/**
 * Log parse completion. Route, duration, counts only — never document content.
 */
function logParse(startTime: number, clauseCount: number, charCount: number): void {
  const duration = Date.now() - startTime;
  logRouteEvent('parse', duration, 'ok', { clauseCount, charCount });
}

/** Structured log entry. */
function logRouteEvent(
  route: string,
  durationMs: number,
  status: string,
  extra?: Record<string, number>,
): void {
  const entry = { route, durationMs, status, ...extra };
  // Using structured output — stderr in production, console in dev
  if (process.env.NODE_ENV === 'production') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
}

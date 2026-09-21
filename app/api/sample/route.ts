/**
 * GET /api/sample — Serves sample contract fixtures.
 *
 * Allows evaluators and users to test PlainClause in one click
 * without uploading a personal contract (DESIGN.md §3.1).
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const SAMPLE_FILES: Record<string, { filename: string; path: string }> = {
  'rent-agreement-mumbai': {
    filename: 'Mumbai Leave & License.txt',
    path: path.join(process.cwd(), 'fixtures', 'rent-agreement-mumbai.txt'),
  },
  'offer-letter': {
    filename: 'Employment Offer Letter.txt',
    path: path.join(process.cwd(), 'fixtures', 'offer-letter.txt'),
  },
  'freelance-msa': {
    filename: 'Freelance Master Services Agreement.txt',
    path: path.join(process.cwd(), 'fixtures', 'freelance-msa.txt'),
  },
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const sampleId = searchParams.get('id') ?? searchParams.get('name') ?? 'rent-agreement-mumbai';

  const sample = SAMPLE_FILES[sampleId];
  if (!sample) {
    return NextResponse.json(
      { error: 'SAMPLE_NOT_FOUND', message: `Sample "${sampleId}" not found. Available: ${Object.keys(SAMPLE_FILES).join(', ')}` },
      { status: 404 },
    );
  }

  try {
    const text = await fs.readFile(/*turbopackIgnore: true*/ sample.path, 'utf-8');
    return NextResponse.json({
      id: sampleId,
      filename: sample.filename,
      text,
    });
  } catch {
    return NextResponse.json(
      { error: 'READ_FAILED', message: 'Failed to read fixture file' },
      { status: 500 },
    );
  }
}

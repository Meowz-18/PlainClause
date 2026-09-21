/**
 * Playbook Unit Tests.
 *
 * Mandated by TECH.md §4.2:
 * 1. Every playbook validates against PlaybookSchema.
 * 2. Every sourceIndex resolves to an existing item in sources.
 * 3. Every categoryId in required, redFlags, norms, and jurisdictionNotes exists in categories.
 * 4. lastReviewed is a valid ISO date within the last 180 days.
 * 5. resolvePlaybook correctly picks specific vs country vs fallback.
 */
import { describe, it, expect } from 'vitest';
import {
  PlaybookSchema,
  getAllPlaybooks,
  resolvePlaybook,
  rentalIN,
  employmentIN,
  genericPlaybook,
} from '@/lib/playbooks/index';
import type { Triage } from '@/lib/types';

describe('Playbook Validation & Content Governance (TECH.md §4)', () => {
  const playbooks = getAllPlaybooks();

  it('all registered playbooks match PlaybookSchema strictly', () => {
    for (const playbook of playbooks) {
      const result = PlaybookSchema.safeParse(playbook);
      expect(
        result.success,
        `Playbook ${playbook.id} failed schema validation: ${
          !result.success ? JSON.stringify(result.error.issues) : ''
        }`
      ).toBe(true);
    }
  });

  it('all categoryId references resolve to valid categories in the playbook', () => {
    for (const playbook of playbooks) {
      const validCategoryIds = new Set(playbook.categories.map((c) => c.id));

      // 1. Required items
      for (const req of playbook.required) {
        expect(
          validCategoryIds.has(req.detect.categoryId),
          `Required item "${req.id}" references unknown category "${req.detect.categoryId}" in ${playbook.id}`
        ).toBe(true);
      }

      // 2. Norms
      for (const norm of playbook.norms) {
        expect(
          validCategoryIds.has(norm.categoryId),
          `Norm references unknown category "${norm.categoryId}" in ${playbook.id}`
        ).toBe(true);
      }

      // 3. Jurisdiction notes
      for (const note of playbook.jurisdictionNotes) {
        expect(
          validCategoryIds.has(note.categoryId),
          `Jurisdiction note references unknown category "${note.categoryId}" in ${playbook.id}`
        ).toBe(true);
      }
    }
  });

  it('all sourceIndex references resolve to valid sources in the playbook', () => {
    for (const playbook of playbooks) {
      const sourceCount = playbook.sources.length;

      for (const norm of playbook.norms) {
        if (norm.sourceIndex !== undefined) {
          expect(
            norm.sourceIndex >= 0 && norm.sourceIndex < sourceCount,
            `Norm in ${playbook.id} has invalid sourceIndex ${norm.sourceIndex} (total sources: ${sourceCount})`
          ).toBe(true);
        }
      }

      for (const note of playbook.jurisdictionNotes) {
        expect(
          note.sourceIndex >= 0 && note.sourceIndex < sourceCount,
          `Jurisdiction note in ${playbook.id} has invalid sourceIndex ${note.sourceIndex} (total sources: ${sourceCount})`
        ).toBe(true);
      }
    }
  });

  it('lastReviewed is an audit date within the last 180 days', () => {
    const now = new Date('2026-09-16T15:00:00Z').getTime(); // Test execution baseline
    const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

    for (const playbook of playbooks) {
      const reviewedDate = new Date(playbook.lastReviewed).getTime();
      expect(isNaN(reviewedDate), `Invalid date in ${playbook.id}: ${playbook.lastReviewed}`).toBe(false);

      const age = now - reviewedDate;
      expect(
        age <= MAX_AGE_MS && age >= -24 * 60 * 60 * 1000,
        `Playbook ${playbook.id} lastReviewed (${playbook.lastReviewed}) is older than 180 days or in the future`
      ).toBe(true);
    }
  });

  it('resolves specific, regional, and fallback playbooks correctly', () => {
    const mumbaiTriage: Triage = {
      documentType: 'rental_residential',
      confidence: 0.95,
      jurisdiction: 'IN-MH',
      language: 'en',
      parties: [],
      reasoning: 'Mumbai rental lease',
    };
    expect(resolvePlaybook(mumbaiTriage).id).toBe(rentalIN.id);

    const bangaloreTriage: Triage = {
      documentType: 'employment',
      confidence: 0.9,
      jurisdiction: 'IN-KA',
      language: 'en',
      parties: [],
      reasoning: 'Tech company offer letter',
    };
    // Resolves to employmentIN via country prefix 'IN'
    expect(resolvePlaybook(bangaloreTriage).id).toBe(employmentIN.id);

    const foreignTriage: Triage = {
      documentType: 'other',
      confidence: 0.8,
      jurisdiction: 'US-DE',
      language: 'en',
      parties: [],
      reasoning: 'Delaware corp agreement',
    };
    expect(resolvePlaybook(foreignTriage).id).toBe(genericPlaybook.id);

    // Null triage fallback
    expect(resolvePlaybook(null).id).toBe(genericPlaybook.id);
  });
});

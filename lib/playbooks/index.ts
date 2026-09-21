/**
 * Playbook Registry & Resolver.
 *
 * Implements TECH.md §4.3:
 * Resolves the appropriate curated playbook given document triage output:
 * 1. Exact documentType + jurisdiction (e.g. rental_residential + IN-MH)
 * 2. documentType + country prefix (e.g. IN-MH -> IN)
 * 3. documentType + generic jurisdiction
 * 4. Generic commercial fallback
 */
import type { Triage } from '@/lib/types';
import type { Playbook } from './schema';
import { rentalIN } from './rental-in';
import { employmentIN } from './employment-in';
import { genericPlaybook } from './generic';

export * from './schema';
export { rentalIN, employmentIN, genericPlaybook };

const PLAYBOOKS: Playbook[] = [rentalIN, employmentIN, genericPlaybook];

/** Get all registered playbooks */
export function getAllPlaybooks(): Playbook[] {
  return PLAYBOOKS;
}

/** Get a specific playbook by its stable identifier */
export function getPlaybookById(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/**
 * Resolve the most specific playbook matching document triage.
 *
 * Hierarchy:
 * 1. Exact match: documentType + jurisdiction (e.g. 'rental_residential' + 'IN-MH')
 * 2. Country-level match: documentType + jurisdiction prefix (e.g. 'IN-MH' -> 'IN')
 * 3. Any playbook matching documentType
 * 4. Generic fallback
 */
export function resolvePlaybook(triage: Triage | null): Playbook {
  if (!triage) {
    return genericPlaybook;
  }

  const { documentType, jurisdiction } = triage;
  const normalizedJurisdiction = (jurisdiction || '').toUpperCase().trim();

  // 1. Exact match (documentType + full jurisdiction)
  const exact = PLAYBOOKS.find(
    (p) =>
      p.documentType === documentType &&
      p.jurisdiction.toUpperCase() === normalizedJurisdiction
  );
  if (exact) return exact;

  // 2. Country prefix match (e.g. "IN-MH" or "IN-DL" -> "IN")
  const countryPrefix = normalizedJurisdiction.split('-')[0];
  if (countryPrefix) {
    const countryMatch = PLAYBOOKS.find(
      (p) =>
        p.documentType === documentType &&
        p.jurisdiction.toUpperCase() === countryPrefix
    );
    if (countryMatch) return countryMatch;
  }

  // 3. DocumentType match
  const typeMatch = PLAYBOOKS.find((p) => p.documentType === documentType);
  if (typeMatch) return typeMatch;

  // 4. Generic fallback
  return genericPlaybook;
}

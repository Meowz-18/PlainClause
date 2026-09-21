/**
 * Safety & Help Resources by Jurisdiction.
 *
 * Implements TECH.md §8.1 & DESIGN.md §3.3:
 * When an urgent situation (eviction today, lock-out, domestic abuse, threats,
 * imminent harm, arrest) is detected, PlainClause prioritises concrete,
 * actionable support resources (NALSA, legal aid, helplines) before
 * touching the document text.
 */

export interface LegalHelpResource {
  name: string;
  phone?: string;
  url?: string;
  description: string;
  hours?: string;
  category: 'legal_aid' | 'emergency' | 'domestic_safety' | 'tenant_rights' | 'worker_rights';
}

export const RESOURCES_INDIA: LegalHelpResource[] = [
  {
    name: 'NALSA Legal Aid Helpline',
    phone: '15100',
    url: 'https://nalsa.gov.in',
    description: 'National Legal Services Authority — Free legal services and counsel for eligible citizens under Legal Services Authorities Act.',
    hours: '24/7 toll-free',
    category: 'legal_aid',
  },
  {
    name: 'National Emergency Response (All Emergencies)',
    phone: '112',
    description: 'Single national emergency helpline for immediate police, medical, or rescue assistance across India.',
    hours: '24/7 toll-free',
    category: 'emergency',
  },
  {
    name: 'Women in Distress National Helpline',
    phone: '181',
    description: 'Support, shelter, and legal intervention for women facing violence, abuse, or harassment.',
    hours: '24/7 toll-free',
    category: 'domestic_safety',
  },
  {
    name: 'National Commission for Women (NCW)',
    phone: '7827170170',
    url: 'http://ncw.nic.in',
    description: 'Complaints & counselling helpline for women facing harassment, coercion, or abuse.',
    hours: '24/7',
    category: 'domestic_safety',
  },
  {
    name: 'District Legal Services Authority (DLSA)',
    url: 'https://nalsa.gov.in/lsams/',
    description: 'Located at every District Court in India. Walk in for assigned pro-bono legal counsel and Lok Adalat mediation.',
    category: 'legal_aid',
  },
];

export const RESOURCES_MAHARASHTRA: LegalHelpResource[] = [
  ...RESOURCES_INDIA,
  {
    name: 'Maharashtra State Legal Services Authority (MSLSA)',
    phone: '022-22691358',
    url: 'https://legalservices.maharashtra.gov.in',
    description: 'State legal aid body providing legal representation and dispute conciliation in Mumbai and Maharashtra.',
    hours: '10:00 AM – 5:00 PM (Working days)',
    category: 'legal_aid',
  },
  {
    name: 'Competent Authority (Rent Control), Mumbai Division',
    description: 'Statutory quasi-judicial authority under Maharashtra Rent Control Act, 1999 handling eviction and licensee possession disputes.',
    category: 'tenant_rights',
  },
];

export const RESOURCES_GLOBAL_FALLBACK: LegalHelpResource[] = [
  {
    name: 'Local Legal Aid Society / Public Defender',
    description: 'Contact your local municipal legal aid bureau, bar association pro-bono panel, or court help desk.',
    category: 'legal_aid',
  },
  {
    name: 'Local Emergency Services',
    phone: '112 or local emergency number',
    description: 'If you are facing immediate threats to safety, unlawful physical eviction, or harm, contact emergency services.',
    category: 'emergency',
  },
];

export function getEmergencyResources(jurisdiction?: string | null): LegalHelpResource[] {
  if (!jurisdiction) return RESOURCES_INDIA;
  const jur = jurisdiction.toUpperCase();

  if (jur === 'IN-MH' || jur.includes('MH') || jur.includes('MUMBAI')) {
    return RESOURCES_MAHARASHTRA;
  }
  if (jur.startsWith('IN')) {
    return RESOURCES_INDIA;
  }
  return RESOURCES_GLOBAL_FALLBACK;
}

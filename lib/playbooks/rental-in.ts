/**
 * Residential Leave & License Agreement Playbook — Maharashtra, India.
 *
 * Implements TECH.md §4: Curated playbook for Maharashtra residential rentals.
 * Provides taxonomy, required baseline protections, red flags, verified market norms,
 * and jurisdiction notes based on the Maharashtra Rent Control Act, 1999 and Model Tenancy Act principles.
 */
import type { Playbook } from './schema';

export const rentalIN: Playbook = {
  id: 'rental-in-mh-v1',
  documentType: 'rental_residential',
  jurisdiction: 'IN-MH',
  displayName: 'Residential Leave & License (Maharashtra, India)',
  lastReviewed: '2026-09-15',
  sources: [
    {
      label: 'Maharashtra Rent Control Act, 1999 — Chapter VII (Licensing & Registration)',
      url: 'https://bombayhighcourt.nic.in/libweb/acts/1999.18.pdf',
    },
    {
      label: 'Indian Contract Act, 1872 — s.73 & s.74 (Damages & Liquidated Penalties)',
      url: 'https://www.indiacode.nic.in/handle/123456789/2187',
    },
    {
      label: 'Model Tenancy Act, 2021 — Ministry of Housing and Urban Affairs (MOHUA)',
      url: 'https://mohua.gov.in/upload/uploadfiles/files/Model_Tenancy_Act_English.pdf',
    },
  ],

  categories: [
    {
      id: 'deposit',
      label: 'Security Deposit',
      description: 'Deposit amounts, deductions, interest, and return deadlines.',
    },
    {
      id: 'entry_inspection',
      label: 'Entry & Inspection',
      description: 'Landlord right of entry, inspection notices, and tenant privacy.',
    },
    {
      id: 'termination',
      label: 'Termination & Lock-in',
      description: 'Notice periods, premature exit, lock-in obligations, and forfeiture.',
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Repairs',
      description: 'Division of responsibility between licensor and licensee for repairs.',
    },
    {
      id: 'rent_escalation',
      label: 'Rent & Escalation',
      description: 'Monthly license fee, payment dates, late fees, and escalation caps.',
    },
    {
      id: 'use_subletting',
      label: 'Use & Restrictions',
      description: 'Permitted residential use, subletting bars, guests, and alterations.',
    },
  ],

  required: [
    {
      id: 'req-deposit-return',
      title: 'Security deposit return timeline stated',
      detect: {
        keywords: ['deposit', 'refund', 'return', 'repay', 'handover'],
        categoryId: 'deposit',
      },
      whyItMatters:
        'Without an explicit deadline to return the security deposit upon moving out, landlords often delay repayment indefinitely.',
      severityIfMissing: 'high',
      suggestedAsk:
        'Ask for a clause specifying deposit refund within 15 to 30 days of handing over vacant possession.',
    },
    {
      id: 'req-inspection-notice',
      title: 'Advance notice required before landlord entry',
      detect: {
        keywords: ['enter', 'inspection', 'inspect', 'visit', 'view', 'access'],
        categoryId: 'entry_inspection',
      },
      whyItMatters:
        'If the landlord has unrestricted right of entry, your privacy and quiet enjoyment are unprotected.',
      severityIfMissing: 'high',
      suggestedAsk:
        'Ask for at least 24 to 48 hours prior written notice before any landlord inspection, during reasonable daylight hours.',
    },
    {
      id: 'req-maintenance-split',
      title: 'Clear division of maintenance and repair responsibilities',
      detect: {
        keywords: ['maintenance', 'repair', 'painting', 'structural', 'wear and tear'],
        categoryId: 'maintenance',
      },
      whyItMatters:
        'Vague repair clauses lead to disputes over whether routine wear, plumbing failures, or structural leaks are deducted from your deposit.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask to clarify that licensee handles minor day-to-day repairs (e.g. up to ₹1,000) while licensor covers structural and major repairs.',
    },
    {
      id: 'req-lockin-symmetry',
      title: 'Mutual notice period after lock-in period',
      detect: {
        keywords: ['notice', 'lock-in', 'terminate', 'vacate'],
        categoryId: 'termination',
      },
      whyItMatters:
        'If exit terms are asymmetric, you may be held to rigid lock-in penalties while the licensor retains flexibility.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask for symmetric 30-day termination notice for both parties after the initial lock-in period.',
    },
  ],

  redFlags: [
    {
      id: 'rf-deposit-no-timeline',
      title: 'Deposit required without refund deadline',
      signals: [
        'deposit payable but no timeline for return',
        'interest free deposit with no mention of refund date',
        'deposit returned at licensors convenience',
      ],
      severity: 'high',
      whyItMatters:
        'You could face indefinite delays or arbitrary deductions with no contractual timeline forcing return.',
      suggestedAsk:
        'Request: "The Licensor shall refund the Security Deposit within 15 days of receiving vacant peaceful possession, subject to deduction of outstanding utility bills."',
    },
    {
      id: 'rf-unrestricted-entry',
      title: 'Landlord can enter without notice',
      signals: [
        'licensor entitled to enter at any time',
        'enter premises without notice to inspect',
        'unrestricted right of inspection',
      ],
      severity: 'high',
      whyItMatters:
        'Allows the landlord to enter your living space unannounced, eliminating your privacy and quiet enjoyment.',
      suggestedAsk:
        'Request: "The Licensor may inspect the premises with at least 24 hours prior written notice, accompanied by the Licensee, between 10:00 AM and 6:00 PM."',
    },
    {
      id: 'rf-unilateral-rent-hike',
      title: 'Mid-term rent increase permitted',
      signals: [
        'right to increase license fee during term',
        'increase rent upon 30 days notice before term expiry',
        'unilateral escalation of license fee',
      ],
      severity: 'high',
      whyItMatters:
        'A fixed-term agreement should fix the rent for its duration; mid-term hikes undermine budgeting predictability.',
      suggestedAsk:
        'Ask for the license fee to remain fixed for the entire 11-month term, with escalation applicable only upon written mutual renewal.',
    },
    {
      id: 'rf-forfeiture-penalty',
      title: 'Disproportionate deposit forfeiture on early exit',
      signals: [
        'entire deposit forfeited if licensee vacates early',
        'lock in penalty exceeding actual rental loss',
      ],
      severity: 'high',
      whyItMatters:
        'Under Indian contract law (s.74), penalties disproportionate to actual loss may be legally questionable, but practically trap your funds.',
      suggestedAsk:
        'Ask to cap early termination liability to 1 month rent or actual loss until a replacement tenant is found.',
    },
    {
      id: 'rf-arbitrary-deductions',
      title: 'Sole discretion over deposit deductions',
      signals: [
        'licensor sole discretion to determine damages',
        'deductions decided solely by licensor without dispute',
      ],
      severity: 'medium',
      whyItMatters:
        'Enables arbitrary deductions for normal wear and tear without third-party quotes or proof of expenditure.',
      suggestedAsk:
        'Ask that any deductions require written itemised receipts and contractor invoices provided within 7 days of inspection.',
    },
  ],

  norms: [
    {
      categoryId: 'deposit',
      statement: 'Comparable residential agreements in Mumbai specify deposit return within 15–30 days from vacant handover.',
      sourceIndex: 2,
    },
    {
      categoryId: 'entry_inspection',
      statement: 'Standard agreements require at least 24 hours prior notice before landlord inspection during daylight hours.',
      sourceIndex: 2,
    },
    {
      categoryId: 'termination',
      statement: 'Mutual notice period of 30 days after a 6-month lock-in period is standard practice in urban Maharashtra rentals.',
      sourceIndex: 0,
    },
    {
      categoryId: 'rent_escalation',
      statement: 'Annual rent escalation for residential licenses is conventionally 5% to 10% upon mutual renewal.',
      sourceIndex: 0,
    },
    {
      categoryId: 'maintenance',
      statement: 'Licensees typically bear minor running repairs up to ₹1,000, while Licensor bears structural repairs and society capital dues.',
      sourceIndex: 2,
    },
  ],

  jurisdictionNotes: [
    {
      categoryId: 'deposit',
      note:
        'Under Maharashtra Leave & License principles and the Maharashtra Rent Control Act, 1999 (s.55), agreements must be registered. Unilateral deposit withholding without verifiable proof of actual damage can be challenged before the Competent Authority.',
      sourceIndex: 0,
    },
    {
      categoryId: 'termination',
      note:
        'Section 74 of the Indian Contract Act, 1872 stipulates that penalty clauses for breach must reflect reasonable compensation for actual damage rather than arbitrary forfeiture.',
      sourceIndex: 1,
    },
    {
      categoryId: 'entry_inspection',
      note:
        'A licensee is entitled to peaceful possession during the license tenure; entry without reasonable advance notice contradicts quiet enjoyment and established rental guidelines.',
      sourceIndex: 2,
    },
  ],
};

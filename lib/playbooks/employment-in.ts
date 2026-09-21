/**
 * Employment Agreement Playbook — India.
 *
 * Implements TECH.md §4: Curated playbook for Indian employment contracts and offer letters.
 * Incorporates statutory constraints from s.27 Indian Contract Act (restraint of trade),
 * s.74 (liquidated damages / training bonds), and standard Indian HR norms.
 */
import type { Playbook } from './schema';

export const employmentIN: Playbook = {
  id: 'employment-in-v1',
  documentType: 'employment',
  jurisdiction: 'IN',
  displayName: 'Employment Agreement (India)',
  lastReviewed: '2026-09-15',
  sources: [
    {
      label: 'Indian Contract Act, 1872 — s.27 (Agreement in Restraint of Trade Void)',
      url: 'https://www.indiacode.nic.in/handle/123456789/2187',
    },
    {
      label: 'Indian Contract Act, 1872 — s.74 (Compensation for Breach of Contract)',
      url: 'https://www.indiacode.nic.in/handle/123456789/2187',
    },
    {
      label: 'Industrial Disputes Act, 1947 — Retrenchment & Notice',
      url: 'https://labour.gov.in/sites/default/files/theindustrialdisputesact1947.pdf',
    },
  ],

  categories: [
    {
      id: 'compensation',
      label: 'Compensation & Benefits',
      description: 'CTC, salary components, variable pay, PF, gratuity, and deductions.',
    },
    {
      id: 'termination',
      label: 'Termination & Notice',
      description: 'Notice period duration, immediate termination, severance, and exit process.',
    },
    {
      id: 'restrictive_covenants',
      label: 'Non-Compete & Restraints',
      description: 'Post-employment restrictions, non-solicitation, exclusivity, and moonlighting.',
    },
    {
      id: 'ip',
      label: 'Intellectual Property',
      description: 'Invention assignment, copyright work-for-hire, and prior personal creations.',
    },
    {
      id: 'training_bond',
      label: 'Training Bonds & Clawbacks',
      description: 'Service commitments, training expenditure recovery, and penalty clauses.',
    },
    {
      id: 'confidentiality',
      label: 'Confidentiality & Data',
      description: 'Non-disclosure of company proprietary data and return of company assets.',
    },
    {
      id: 'probation',
      label: 'Probation & Confirmation',
      description: 'Probation period, performance review standards, and confirmation timeline.',
    },
  ],

  required: [
    {
      id: 'req-notice-symmetry',
      title: 'Notice period applies equally to both sides',
      detect: {
        keywords: ['notice period', 'terminate', 'resignation', 'notice in writing'],
        categoryId: 'termination',
      },
      whyItMatters:
        'If only the employee must serve a lengthy notice period (e.g. 90 days) while the employer can terminate with little or no notice, you carry all transition risk.',
      severityIfMissing: 'high',
      suggestedAsk:
        'Ask for symmetric notice duration (e.g. 30 or 60 days) applying equally to both employee resignation and employer termination.',
    },
    {
      id: 'req-salary-components',
      title: 'CTC salary component breakdown stated',
      detect: {
        keywords: ['basic', 'hra', 'ctc', 'allowance', 'provident fund', 'gross'],
        categoryId: 'compensation',
      },
      whyItMatters:
        'A single lump-sum CTC figure without a written salary annexure can mask high variable deductions or an artificially low basic pay.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask for a formal salary annexure detailing Basic Pay, HRA, Special Allowance, and employer PF contribution.',
    },
    {
      id: 'req-ip-scope',
      title: 'IP assignment limited to course of employment',
      detect: {
        keywords: ['intellectual property', 'invention', 'assign', 'work for hire', 'copyright'],
        categoryId: 'ip',
      },
      whyItMatters:
        'Overly broad IP clauses can unintentionally claim ownership of projects or code you write on your own time using your own equipment.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask to clarify that IP assignment covers only inventions created within the scope of your employment duties using company resources.',
    },
  ],

  redFlags: [
    {
      id: 'rf-noncompete',
      title: 'Post-employment non-compete clause',
      signals: [
        'shall not join a competitor for a period of',
        'restricted from working in the same industry after termination',
        'bar on working for competitive businesses post exit',
      ],
      severity: 'medium',
      whyItMatters:
        'Even though post-employment non-competes are generally void under s.27 Indian Contract Act, companies may still use them to threaten or delay your career moves.',
      suggestedAsk:
        'Ask to remove the post-employment non-compete restriction, or narrow it to protecting proprietary trade secrets and non-solicitation of clients.',
    },
    {
      id: 'rf-training-bond',
      title: 'Training bond or service commitment with penalty',
      signals: [
        'minimum service commitment of',
        'liquidated damages payable if leaving before',
        'repay entire bond amount upon resignation',
      ],
      severity: 'high',
      whyItMatters:
        'A service bond can turn a routine career transition into an immediate financial liability of lakhs of rupees.',
      suggestedAsk:
        'Ask whether specialised training will actually be provided, request proof of direct costs, and insist that any repayment obligation decreases proportionately each month.',
    },
    {
      id: 'rf-asymmetric-notice',
      title: 'Asymmetric termination notice',
      signals: [
        'employee must give 90 days but company can terminate on 15 days',
        'company may terminate immediately without notice or pay in lieu',
      ],
      severity: 'high',
      whyItMatters:
        'Leaves you vulnerable to sudden unemployment while binding you to 2–3 months of restricted exit time when moving to a new role.',
      suggestedAsk:
        'Ask for reciprocal notice terms: the employer must give the same notice period or pay salary in lieu of notice.',
    },
    {
      id: 'rf-unilateral-salary-reduction',
      title: 'Right to unilaterally alter compensation',
      signals: [
        'company reserves right to modify remuneration',
        'restructure CTC at sole discretion',
      ],
      severity: 'high',
      whyItMatters:
        'Enables the employer to reduce fixed pay or convert base salary into uncertain performance incentives without mutual consent.',
      suggestedAsk:
        'Ask for changes to fixed compensation and role responsibilities to require mutual written agreement.',
    },
  ],

  norms: [
    {
      categoryId: 'termination',
      statement: 'Notice periods of 30–90 days are standard in India; symmetric notice applying equally to both parties is standard practice.',
      sourceIndex: 2,
    },
    {
      categoryId: 'restrictive_covenants',
      statement: 'Post-employment non-solicitation of clients and team members is standard (typically 6–12 months); post-employment non-competes are generally held void under Indian law.',
      sourceIndex: 0,
    },
    {
      categoryId: 'ip',
      statement: 'Invention assignment is standard, but normally excludes prior inventions and creative work developed outside working hours on personal devices.',
      sourceIndex: 0,
    },
    {
      categoryId: 'training_bond',
      statement: 'Training bonds in India are enforceable only to the extent of actual, documented training expenses incurred by the employer, amortized over time.',
      sourceIndex: 1,
    },
  ],

  jurisdictionNotes: [
    {
      categoryId: 'restrictive_covenants',
      note:
        'Under Section 27 of the Indian Contract Act, 1872, any agreement restraining anyone from exercising a lawful profession, trade, or business is void. Indian courts (e.g. Niranjan Shankar Golikari, Percept D\'Mark v. Zaheer Khan) have consistently held that negative covenants operating after the termination of employment are unenforceable in India.',
      sourceIndex: 0,
    },
    {
      categoryId: 'training_bond',
      note:
        'Under Section 74 of the Indian Contract Act, 1872, an employer cannot extract punitive damages via employment bonds. The Supreme Court and High Courts have held that employers can only recover actual, verifiable out-of-pocket expenses for specialised training, not arbitrary penalty sums.',
      sourceIndex: 1,
    },
  ],
};

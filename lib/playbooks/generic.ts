/**
 * Generic Fallback Playbook.
 *
 * Implements TECH.md §4: Baseline contract analysis playbook for commercial contracts,
 * consulting agreements, NDAs, and unclassified agreements.
 */
import type { Playbook } from './schema';

export const genericPlaybook: Playbook = {
  id: 'generic-v1',
  documentType: 'other',
  jurisdiction: 'generic',
  displayName: 'Commercial Agreement (General Fallback)',
  lastReviewed: '2026-09-15',
  sources: [
    {
      label: 'Indian Contract Act, 1872 — General Principles (s.73 & s.74)',
      url: 'https://www.indiacode.nic.in/handle/123456789/2187',
    },
  ],

  categories: [
    {
      id: 'termination',
      label: 'Termination & Cancellation',
      description: 'Exit conditions, notice periods, immediate termination, and post-termination duties.',
    },
    {
      id: 'liability_indemnity',
      label: 'Liability & Indemnification',
      description: 'Limitation of liability, indemnity obligations, consequential damages, and caps.',
    },
    {
      id: 'payment',
      label: 'Payment & Fees',
      description: 'Compensation, payment milestones, invoicing terms, and late payment penalties.',
    },
    {
      id: 'ip',
      label: 'Intellectual Property & Deliverables',
      description: 'Ownership of project outputs, pre-existing IP, licenses, and moral rights.',
    },
    {
      id: 'dispute_resolution',
      label: 'Dispute Resolution & Law',
      description: 'Governing law, exclusive court jurisdiction, arbitration rules, and mediation.',
    },
  ],

  required: [
    {
      id: 'req-termination-notice',
      title: 'Mutual notice requirement for termination',
      detect: {
        keywords: ['terminate', 'notice in writing', 'written notice', 'cancellation'],
        categoryId: 'termination',
      },
      whyItMatters:
        'Without a defined notice period, either party might abruptly cancel the agreement with no time to transition or recover investments.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask for a clause requiring at least 30 days prior written notice for convenience termination by either party.',
    },
    {
      id: 'req-liability-cap',
      title: 'Limitation of liability cap included',
      detect: {
        keywords: ['limitation of liability', 'liability shall not exceed', 'consequential damages', 'aggregate liability'],
        categoryId: 'liability_indemnity',
      },
      whyItMatters:
        'Without an aggregate liability cap, an unforeseen breach could expose you to unbounded financial claims far exceeding contract value.',
      severityIfMissing: 'medium',
      suggestedAsk:
        'Ask to cap total aggregate liability to the total fees paid or payable under the agreement in the preceding 12 months.',
    },
  ],

  redFlags: [
    {
      id: 'rf-unilateral-termination',
      title: 'Unilateral immediate termination right',
      signals: [
        'counterparty may terminate at any time without notice',
        'immediate termination without cause by one party only',
      ],
      severity: 'high',
      whyItMatters:
        'Leaves you subject to sudden cancellation without reciprocal exit rights or transition compensation.',
      suggestedAsk:
        'Ask that termination for convenience requires equal advance notice and payment for all completed work.',
    },
    {
      id: 'rf-uncapped-indemnity',
      title: 'Uncapped or one-way indemnity obligation',
      signals: [
        'indemnify and hold harmless against any and all claims',
        'indemnity including consequential and indirect damages',
      ],
      severity: 'high',
      whyItMatters:
        'Indemnities without reasonable caps or exclusions for gross negligence can shift third-party operational risks entirely onto you.',
      suggestedAsk:
        'Ask to cap indemnity liability and exclude indirect or consequential losses.',
    },
    {
      id: 'rf-unilateral-amendment',
      title: 'Right to amend terms unilaterally',
      signals: [
        'company may modify these terms at its sole discretion',
        'terms subject to change without prior notice',
      ],
      severity: 'high',
      whyItMatters:
        'Allows the other party to alter obligations, payment terms, or liability rules without your affirmative consent.',
      suggestedAsk:
        'Ask that any amendment or variation to the agreement requires written agreement signed by both parties.',
    },
  ],

  norms: [
    {
      categoryId: 'liability_indemnity',
      statement: 'Commercial agreements standardly cap total liability to 1x–2x total fees paid over the prior 12 months, and exclude indirect or consequential damages.',
      sourceIndex: 0,
    },
    {
      categoryId: 'termination',
      statement: 'A mutual 30-day written notice period for convenience termination is standard commercial practice.',
      sourceIndex: 0,
    },
    {
      categoryId: 'payment',
      statement: 'Standard commercial invoice payment terms are Net 15 to Net 30 days from invoice receipt.',
      sourceIndex: 0,
    },
  ],

  jurisdictionNotes: [
    {
      categoryId: 'liability_indemnity',
      note:
        'Under Section 73 and 74 of the Indian Contract Act, 1872, damages are limited to proximate and foreseeable losses arising naturally from a breach. Liquidated damages must represent a genuine pre-estimate of loss, not punitive penalties.',
      sourceIndex: 0,
    },
  ],
};

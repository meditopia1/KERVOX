export type PolicySectionSeed = {
  section_type: string;
  title: string | null;
  content: string;
  display_order: number;
};

const SECTION_INTROS: Record<string, Array<{ title: string | null; content: string }>> = {
  definitions: [
    {
      title: 'Policy Definitions',
      content: 'Add the key terms and meanings that apply to this product.',
    },
  ],
  'waiting-periods': [
    {
      title: 'General Waiting Period',
      content: 'Describe the standard waiting period that applies from inception date.',
    },
    {
      title: 'Pre-Existing Conditions',
      content: 'Describe the exclusion or waiting period that applies to pre-existing conditions.',
    },
  ],
  'general-provisions': [
    {
      title: 'General Provision',
      content: 'Add the overarching provisions that govern this policy.',
    },
  ],
  'payment-premium': [
    {
      title: 'Premium Payment Terms',
      content: 'Describe how premiums are collected, due dates, and grace periods.',
    },
  ],
  'exclusions-limitations': [
    {
      title: 'General Exclusion',
      content: 'Add an exclusion or limitation that applies to this product.',
    },
  ],
  'general-conditions': [
    {
      title: 'General Condition',
      content: 'Describe a general condition that members or providers must satisfy.',
    },
  ],
  'insuring-section': [
    {
      title: 'Core Benefit',
      content: 'Describe the main insured benefits available under this product.',
    },
  ],
  'funeral-benefit': [
    {
      title: 'Funeral Benefit',
      content: 'Describe the funeral benefit structure and payout conditions, if applicable.',
    },
  ],
  'critical-illness-definitions': [
    {
      title: 'Critical Illness Definition',
      content: 'Add the clinical definition and qualifying criteria for the relevant illness.',
    },
  ],
};

export function buildStarterPolicySections(productId: string): PolicySectionSeed[] {
  return Object.entries(SECTION_INTROS).flatMap(([sectionType, items]) =>
    items.map((item, index) => ({
      product_id: productId,
      section_type: sectionType,
      title: item.title,
      content: item.content,
      display_order: index + 1,
    }))
  );
}

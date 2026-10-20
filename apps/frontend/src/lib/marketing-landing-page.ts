export type LandingPageStatus = 'draft' | 'active';
export type LandingPageCtaHref = '/' | '/login';

export interface LandingPageInput {
  name: string;
  slug: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: LandingPageCtaHref;
  status: LandingPageStatus;
}

export interface MarketingLandingPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  template: string;
  content?: unknown;
  status: string;
  created_at: string;
  updated_at: string;
  stats?: {
    visits: number;
    leads: number;
    conversionRate: number;
  };
}

export function isOriginalMarketingLandingContent(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false;
  const sections = (content as Record<string, unknown>).sections;
  return Array.isArray(sections) && sections.some((section) =>
    section && typeof section === 'object' && !Array.isArray(section) &&
    (section as Record<string, unknown>).type === 'plan-slider');
}

const legacyHealthCopy = /day\s*1|health|medical|patient|clinic|wellness|insurance|claim|hospital|cover|policy|benefit/i;

export function brandedLandingPageName(value: string): string {
  return legacyHealthCopy.test(value) ? 'KERVOX Connected Operations' : value;
}

export function brandedLandingPageDescription(value: string): string {
  return legacyHealthCopy.test(value)
    ? 'A connected workspace for teams, workflows, and business operations.'
    : value;
}

export function brandedLandingPageTitle(value: string): string {
  return legacyHealthCopy.test(value) ? 'Your operations, connected.' : value;
}

export function slugifyLandingPageName(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/g, '');
}

export function parseLandingPageInput(input: unknown):
  | { value: LandingPageInput; error?: never }
  | { value?: never; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Enter the landing-page details.' };
  }

  const body = input as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const ctaLabel = typeof body.ctaLabel === 'string' ? body.ctaLabel.trim() : '';
  const ctaHref = body.ctaHref;
  const status = body.status;

  if (!name || name.length > 255) return { error: 'Page name is required and must be 255 characters or fewer.' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    return { error: 'URL slug must use lowercase letters, numbers, and single hyphens (100 characters or fewer).' };
  }
  if (!title || title.length > 500) return { error: 'Headline is required and must be 500 characters or fewer.' };
  if (!description || description.length > 1000) return { error: 'Description is required and must be 1,000 characters or fewer.' };
  if (!ctaLabel || ctaLabel.length > 80) return { error: 'Button text is required and must be 80 characters or fewer.' };
  if (ctaHref !== '/' && ctaHref !== '/login') return { error: 'Choose a valid button destination.' };
  if (status !== 'draft' && status !== 'active') return { error: 'Choose draft or published status.' };

  return { value: { name, slug, title, description, ctaLabel, ctaHref, status } };
}

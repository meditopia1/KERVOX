import { isOriginalMarketingLandingContent, parseLandingPageInput, slugifyLandingPageName } from '../marketing-landing-page';

const validInput = {
  name: 'Connected operations',
  slug: 'connected-operations',
  title: 'Your operations, connected.',
  description: 'Bring teams and workflows together.',
  ctaLabel: 'Enter your workspace',
  ctaHref: '/login',
  status: 'draft',
};

describe('marketing landing-page input', () => {
  it('turns a page name into a safe URL slug', () => {
    expect(slugifyLandingPageName('  KERVOX: Connected Operations!  ')).toBe('kervox-connected-operations');
  });

  it('accepts a complete branded page', () => {
    expect(parseLandingPageInput(validInput)).toEqual({ value: validInput });
  });

  it('rejects unsafe button destinations', () => {
    expect(parseLandingPageInput({ ...validInput, ctaHref: 'javascript:alert(1)' }).error)
      .toBe('Choose a valid button destination.');
  });

  it('rejects invalid slugs and publishing states', () => {
    expect(parseLandingPageInput({ ...validInput, slug: 'Bad Slug' }).error).toMatch(/URL slug/);
    expect(parseLandingPageInput({ ...validInput, status: 'archived' }).error).toMatch(/draft or published/);
  });

  it('recognizes the saved original campaign without changing new pages', () => {
    expect(isOriginalMarketingLandingContent({ sections: [{ type: 'plan-slider' }] })).toBe(true);
    expect(isOriginalMarketingLandingContent({ sections: [] })).toBe(false);
  });
});

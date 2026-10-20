'use client';

import { Hero } from './Hero';
import { PlanSlider, type PlanSlide } from './PlanSlider';
import { ValuePromiseStrip } from './ValuePromiseStrip';
import { ThreePlanCards } from './ThreePlanCards';
import { UnlimitedEventsBanner } from './UnlimitedEventsBanner';
import { WhatYouGet } from './WhatYouGet';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

type Section = Record<string, unknown> & { type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getSections(content: unknown): Section[] {
  if (!isRecord(content) || !Array.isArray(content.sections)) return [];
  return content.sections.filter((section): section is Section => isRecord(section) && typeof section.type === 'string');
}

function getSavedSlides(section: Section): PlanSlide[] | undefined {
  if (!Array.isArray(section.slides)) return undefined;
  const slides = section.slides.filter((slide): slide is Record<string, unknown> => isRecord(slide))
    .flatMap((slide): PlanSlide[] => {
      const pricing = isRecord(slide.pricing) ? slide.pricing : {};
      const benefits = Array.isArray(slide.benefits) ? slide.benefits : [];
      if (typeof slide.name !== 'string' || typeof slide.price !== 'number' ||
        typeof pricing.spouse !== 'number' || typeof pricing.child !== 'number') return [];

      return [{
        name: slide.name,
        price: slide.price,
        ageRange: typeof slide.ageRange === 'string' ? slide.ageRange : '',
        bgImage: typeof slide.bgImage === 'string' && /^\/[a-zA-Z0-9/_.-]+$/.test(slide.bgImage)
          ? slide.bgImage : '/bg1.jpg',
        sliderName: typeof slide.sliderName === 'string' ? slide.sliderName : '',
        pricing: { spouse: pricing.spouse, child: pricing.child, maxMembers: 4 },
        benefits: benefits.filter((benefit): benefit is Record<string, unknown> => isRecord(benefit))
          .filter((benefit) => typeof benefit.title === 'string' && Array.isArray(benefit.details))
          .map((benefit) => ({
            icon: typeof benefit.icon === 'string' ? benefit.icon : '',
            title: benefit.title as string,
            details: (benefit.details as unknown[]).filter((detail): detail is string => typeof detail === 'string'),
          })),
      }];
    });

  return slides.length > 0 ? slides : undefined;
}

function getTextItems(section: Section, key: 'promises' | 'benefits') {
  const values = section[key];
  if (!Array.isArray(values)) return undefined;
  const items = values.filter((value): value is Record<string, unknown> => isRecord(value))
    .filter((value) => typeof value.icon === 'string' && typeof value.text === 'string')
    .map((value) => ({ icon: value.icon as string, text: value.text as string }));
  return items.length > 0 ? items : undefined;
}

export function OriginalMarketingLandingPage({ content }: { content: unknown }) {
  const sections = getSections(content);

  return (
    <main className="bg-white text-slate-900">
      <Hero />
      {sections.map((section, index) => {
        switch (section.type) {
          case 'plan-slider':
            return <PlanSlider key={index} slides={getSavedSlides(section)} />;
          case 'value-promise-strip':
            return <ValuePromiseStrip key={index} items={getTextItems(section, 'promises')} />;
          case 'three-plan-cards':
            return <ThreePlanCards key={index} />;
          case 'unlimited-events-banner':
            return <UnlimitedEventsBanner key={index} />;
          case 'what-you-get':
            return <WhatYouGet key={index} items={getTextItems(section, 'benefits')} />;
          default:
            return null;
        }
      })}
      <FinalCTA />
      <Footer />
    </main>
  );
}

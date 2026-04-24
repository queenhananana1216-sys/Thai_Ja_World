import type { LandingFeature, PainPoint, Testimonial } from '@/lib/landing/types';
import type { Bilingual } from '@/lib/landing/landingPageCopyShared';

export type ProblemSectionCopy = {
  title: Bilingual;
  points: PainPoint[];
  footer: Bilingual;
};

export type ServiceSectionCopy = {
  title: Bilingual;
  subtitle: Bilingual;
  features: LandingFeature[];
};

export type TestimonialSectionCopy = {
  title: Bilingual;
  items: Testimonial[];
};

export type MergedLandingPageCopy = {
  problem: ProblemSectionCopy;
  service: ServiceSectionCopy;
  testimonial: TestimonialSectionCopy;
  sectionsDegraded: boolean;
};

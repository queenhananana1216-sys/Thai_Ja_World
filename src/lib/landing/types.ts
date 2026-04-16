export interface StatsResponse {
  postCount: number;
  spotCount: number;
  newsCount: number;
  memberCount: number;
  lastUpdatedAt: string | null;
}

export interface PainPoint {
  id: string;
  title: string;
  quote: string;
  detail: string;
}

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
}

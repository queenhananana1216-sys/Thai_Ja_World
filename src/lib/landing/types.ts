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

export interface EntryFlowLane {
  id: 'trade' | 'job' | 'local' | 'minihome';
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  signal: string;
  score: number;
}

export interface EntryFlowSnapshot {
  posts7d: number;
  flea7d: number;
  job7d: number;
  publishedShops: number;
  deliveryReadyShops: number;
  minihomePublicRooms: number;
  news3d: number;
  tradeClicks14d: number;
  jobClicks14d: number;
  localClicks14d: number;
  minihomeClicks14d: number;
  tradeConversions14d: number;
  jobConversions14d: number;
  localConversions14d: number;
  minihomeConversions14d: number;
}

export interface EntryFlowResponse {
  generatedAt: string;
  lanes: EntryFlowLane[];
  snapshot: EntryFlowSnapshot;
}

export type SafetyContactKind =
  | 'embassy'
  | 'police'
  | 'medical'
  | 'tourist_police'
  | 'korean_24h'
  | 'report'
  | 'other';

export type PublicSafetyContact = {
  id: string;
  kind: SafetyContactKind;
  label: string;
  value: string;
  valueKind: 'phone' | 'url' | 'text';
  sourceUrl: string | null;
  sourceNote: string | null;
  href: string | null;
  displayOrder: number;
};

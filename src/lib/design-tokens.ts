/**
 * 태자월드 디자인 토큰 — 코드 + 피그마 공유 원본
 * Tailwind @theme에 매핑됨 (app/globals.css)
 */

export const colors = {
  museum: {
    coral: '#d42f3d',
    saffron: '#e6a303',
    cobalt: '#3a0ca3',
    blue: '#3753d6',
    teal: '#05b888',
    ink: '#0d0d0f',
  },
  brand: {
    tai: '#6d28d9',
    ja: '#be185d',
  },
  surface: {
    bg: '#e3ddd1',
    surface: '#fdfcf4',
    ink: '#0a0a0c',
    muted: '#2a2a32',
    line: '#18181c',
  },
  accent: {
    lilac: '#6508a3',
    lilacSoft: '#ddc6ee',
    rose: '#d42f3d',
    peach: '#e6a303',
  },
  semantic: {
    success: '#05b888',
    warning: '#e6a303',
    error: '#d42f3d',
    info: '#3753d6',
  },
} as const;

export const typography = {
  fontFamily: {
    ko: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif",
    th: "'Noto Sans Thai', 'Sukhumvit Set', 'Leelawadee UI', system-ui, sans-serif",
  },
  scale: {
    xs: { size: '0.75rem', lineHeight: '1rem' },
    sm: { size: '0.875rem', lineHeight: '1.25rem' },
    base: { size: '1rem', lineHeight: '1.5rem' },
    lg: { size: '1.125rem', lineHeight: '1.75rem' },
    xl: { size: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { size: '1.5rem', lineHeight: '2rem' },
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
  },
} as const;

export const spacing = {
  base: 4,
  scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64] as const,
} as const;

export const shadows = {
  retro: '6px 6px 0 rgba(13, 13, 15, 0.18)',
  retroSaffron: '5px 5px 0 rgba(230, 163, 3, 0.6)',
  retroCoral: '5px 5px 0 rgba(212, 47, 61, 0.4)',
  retroCobalt: '5px 5px 0 rgba(58, 12, 163, 0.3)',
  sm: '0 1px 2px rgba(13, 13, 15, 0.05)',
  md: '0 4px 12px rgba(13, 13, 15, 0.08)',
  lg: '0 8px 24px rgba(13, 13, 15, 0.12)',
} as const;

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

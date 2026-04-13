import type { Locale } from '@/i18n/types';

export type MinihomeThemePreset = {
  id: string;
  labelKo: string;
  labelTh: string;
  accent: string;
  wallpaper?: string;
  room_skin?: string;
};

export const MINIHOME_THEME_PRESETS: MinihomeThemePreset[] = [
  {
    id: 'violet-night',
    labelKo: '보라 밤',
    labelTh: 'ม่วงยามค่ำ',
    accent: '#7c3aed',
    wallpaper: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'mint-cafe',
    labelKo: '민트 카페',
    labelTh: 'คาเฟ่มินต์',
    accent: '#0f766e',
    wallpaper: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'sunset-market',
    labelKo: '노을 마켓',
    labelTh: 'ตลาดยามเย็น',
    accent: '#ea580c',
    wallpaper: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1280&q=80',
  },
];

export function themePresetLabel(preset: MinihomeThemePreset, locale: Locale): string {
  return locale === 'th' ? preset.labelTh : preset.labelKo;
}


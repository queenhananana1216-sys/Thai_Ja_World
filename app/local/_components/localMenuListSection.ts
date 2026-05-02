/** `local_menus.list_section` — DB와 동기 */
export type LocalMenuListSection = 'menu' | 'pricing' | 'service';

export function normalizeLocalMenuListSection(raw: unknown): LocalMenuListSection {
  if (raw === 'pricing' || raw === 'service') return raw;
  return 'menu';
}

export const LOCAL_MENU_SECTION_TABS: {
  key: LocalMenuListSection;
  label: string;
  short: string;
}[] = [
  { key: 'menu', label: '🍽️ 메뉴판', short: '메뉴' },
  { key: 'pricing', label: '💰 가격표', short: '가격' },
  { key: 'service', label: '💆‍♀️ 시술표', short: '시술' },
];

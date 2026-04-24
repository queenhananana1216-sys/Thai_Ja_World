import type { ReactNode } from 'react';

type Props = {
  /** 3열(데스크톱) — `lg:grid-cols-12` + 슬롯 */
  left: ReactNode;
  main: ReactNode;
  right: ReactNode;
};

/**
 * 포털 3열: 좌(보조) / 중(스택) / 우(보조). `gap-4` 고정, 한 쉘에서만.
 */
export function WidgetGrid({ left, main, right }: Props) {
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start"
      data-layout="portal-widget-grid"
    >
      <div className="min-w-0 space-y-4 lg:col-span-3">{left}</div>
      <div className="min-w-0 space-y-4 lg:col-span-6">{main}</div>
      <div className="min-w-0 space-y-4 lg:col-span-3">{right}</div>
    </div>
  );
}

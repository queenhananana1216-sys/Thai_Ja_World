'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * 상점·스킨 구매 UI에서 setPreviewCost(가격) 호출 →
 * 환율 리모컨 등에 보유 − 가격 = 잔여 가 실시간 반영.
 */
type Value = {
  previewCost: number;
  setPreviewCost: (n: number) => void;
  clearPreview: () => void;
};

const Ctx = createContext<Value | null>(null);

export function StyleScorePreviewProvider({ children }: { children: ReactNode }) {
  const [previewCost, setPreviewCostState] = useState(0);
  const setPreviewCost = useCallback((n: number) => {
    setPreviewCostState(Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  }, []);
  const clearPreview = useCallback(() => setPreviewCostState(0), []);
  const v = useMemo(
    () => ({ previewCost, setPreviewCost, clearPreview }),
    [previewCost, setPreviewCost, clearPreview],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useStyleScorePreview(): Value {
  const v = useContext(Ctx);
  if (!v) {
    return {
      previewCost: 0,
      setPreviewCost: () => {},
      clearPreview: () => {},
    };
  }
  return v;
}

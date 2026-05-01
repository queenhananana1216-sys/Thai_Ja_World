import styles from '../../portal/portal-2026.module.css';

const DEFAULT_MESSAGE =
  '🤖 현재 AI가 태국 현지 뉴스를 한국어로 번역 및 요약하고 있습니다. 잠시 후 업데이트됩니다.';

type Props = {
  message?: string;
  className?: string;
};

/** 한국어 가공 뉴스가 없을 때 — 스켈레톤 대신 고정 안내(다크 글라스) */
export default function KoreanNewsPipelineNotice({ message, className }: Props) {
  const text = message?.trim() ? message.trim() : DEFAULT_MESSAGE;
  return (
    <div
      className={`${styles.glassGold} border-amber-400/25 px-4 py-5 text-center shadow-lg ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <p className="m-0 text-[0.95rem] font-medium leading-relaxed text-slate-100">{text}</p>
    </div>
  );
}

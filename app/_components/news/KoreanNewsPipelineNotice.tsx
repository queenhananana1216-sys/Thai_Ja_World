import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';
import styles from '../../portal/portal-2026.module.css';

const DEFAULT_MESSAGE =
  '현지 리포터가 소식을 정리 중입니다. 운영팀이 팩트체크 후 업로드 예정입니다.';

type Props = {
  message?: string;
  className?: string;
};

/** 한국어 가공 뉴스가 없을 때 — 스켈레톤 대신 고정 안내(다크 글라스) */
export default function KoreanNewsPipelineNotice({ message, className }: Props) {
  const text = message?.trim() ? message.trim() : DEFAULT_MESSAGE;
  return (
    <div
      className={`${styles.glassGold} flex flex-col items-center gap-3 border-amber-400/25 px-4 py-5 text-center shadow-lg ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <TjBrandElephantMark size={44} animate="breathe" />
      <p className="m-0 text-[0.95rem] font-medium leading-relaxed text-slate-100">{text}</p>
    </div>
  );
}

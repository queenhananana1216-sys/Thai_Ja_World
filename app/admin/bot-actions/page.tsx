/**
 * app/admin/bot-actions/page.tsx — Bot Actions 관리 콘솔 (Server Component)
 *
 * 서버에서 SUPABASE_SERVICE_ROLE_KEY 로 데이터를 조회한 뒤
 * 클라이언트 컴포넌트에 직렬화 가능한 데이터만 전달합니다.
 * Service Role 키는 절대 클라이언트 번들에 포함되지 않습니다.
 *
 * URL 파라미터 (모두 선택):
 *   ?bot_name=engagement_optimizer
 *   &action_type=analyze
 *   &status=success
 *   &date_from=2026-03-01
 *   &date_to=2026-03-22
 */

import { Suspense } from 'react';
import { queryBotActions, getDistinctBotNames } from '@/bots/adapters/botActionsQuery';
import type { AdminFilters, BotActionType, BotActionStatus } from '@/bots/types/botTypes';
import BotActionsClient from './_components/BotActionsClient';

// Next.js 15: searchParams 는 Promise 타입
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v || undefined;
  if (Array.isArray(v)) return v[0] || undefined;
  return undefined;
}

export default async function BotActionsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: AdminFilters = {
    bot_name: firstString(params['bot_name']),
    action_type: (firstString(params['action_type']) ?? '') as BotActionType | '',
    status: (firstString(params['status']) ?? '') as BotActionStatus | '',
    date_from: firstString(params['date_from']),
    date_to: firstString(params['date_to']),
  };

  // 두 쿼리를 병렬 실행 (독립적)
  const [rows, botNames] = await Promise.all([
    queryBotActions(filters),
    getDistinctBotNames(),
  ]);

  return (
    <main
      style={{
        padding: '20px 24px',
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
          bot_actions
        </h1>
        <span
          style={{
            fontSize: '11px',
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          최대 200행 조회
        </span>
      </div>

      {/* useSearchParams 사용 클라이언트 컴포넌트는 Suspense 로 감쌉니다 */}
      <Suspense
        fallback={
          <div style={{ color: '#6b7280', padding: '24px' }}>
            데이터 로드 중...
          </div>
        }
      >
        <BotActionsClient
          rows={rows}
          botNames={botNames}
          initialFilters={filters}
        />
      </Suspense>
    </main>
  );
}

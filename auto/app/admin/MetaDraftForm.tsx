'use client';

import { useActionState } from 'react';
import { runMetaDraftAction, type MetaDraftState } from './metaDraftAction';

const initial: MetaDraftState = null;

export function MetaDraftForm() {
  const [state, formAction] = useActionState(runMetaDraftAction, initial);

  return (
    <div>
      <form action={formAction} className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem' }}>
        <label style={{ flex: '1 1 140px', minWidth: 120 }}>
          경로
          <input name="path" type="text" defaultValue="/" required autoComplete="off" />
        </label>
        <label style={{ flex: '2 1 200px', minWidth: 180 }}>
          메모리 검색 보강 (선택)
          <input name="memoryQuery" type="text" placeholder="예: 비자 TM30" autoComplete="off" />
        </label>
        <label style={{ flex: '0 1 80px' }}>
          로케일
          <input name="locale" type="text" placeholder="ko" defaultValue="ko" autoComplete="off" />
        </label>
        <button type="submit">메타 초안 실행</button>
      </form>

      {state?.ok === false ? (
        <p style={{ color: 'var(--danger)', marginTop: '0.75rem' }} role="alert">
          {state.error}
        </p>
      ) : null}

      {state?.ok === true ? (
        <div style={{ marginTop: '1rem' }}>
          <p className="muted" style={{ marginBottom: '0.5rem' }}>
            <strong>title</strong>
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.85rem',
              background: '#0d1117',
              padding: '0.65rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            {state.out.title}
          </pre>
          <p className="muted" style={{ margin: '0.75rem 0 0.35rem' }}>
            <strong>description</strong>
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.85rem',
              background: '#0d1117',
              padding: '0.65rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            {state.out.description}
          </pre>
          <p className="muted" style={{ margin: '0.75rem 0 0.35rem' }}>
            <strong>note</strong> ·{' '}
            {state.out.memoryIds?.length ? (
              <span>
                참고 메모 ID: {state.out.memoryIds.join(', ')}
              </span>
            ) : (
              <span>메모 미참조</span>
            )}
          </p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.8rem',
              background: '#0d1117',
              padding: '0.65rem 0.75rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            {state.out.note}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 14px',
          background: open ? '#f8fafc' : '#fff',
          border: 'none',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <span style={{ fontSize: 12, color: '#64748b' }}>{open ? '접기' : '펼치기'}</span>
      </button>
      {open ? (
        <div style={{ padding: '0 14px 14px', fontSize: 13, lineHeight: 1.65, color: '#334155' }}>{children}</div>
      ) : null}
    </div>
  );
}

/**
 * 태자월드 편집 기준 — 관리자가 보는 초안과 이용자 화면을 맞출 때 참고
 */
export default function TaejaEditorialTips() {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px', fontWeight: 800, color: '#0f172a' }}>태자 편집 팁</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
        <strong>원칙:</strong> 관리자 큐에서 최종 승인한 글은 <strong>홈·뉴스·광장·/tips</strong>에 그대로 반영됩니다. 편집은 «우리가 직접 쓴
        안내」라고 생각하고 다듬어 주세요.
      </p>

      <Section title="1. 뉴스(봇 수집 기사)" defaultOpen>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>제목</strong>은 내부용 메타 문구(「기사 메타데이터」 등)가 아니라, 이용자가 클릭하고 싶은 한 줄로 고칩니다.
          </li>
          <li>
            <strong>한국어 요약</strong>은 최소 약 20자 이상, 사실·출처 범위 안에서만 씁니다. 추측·선동·과장은 피합니다.
          </li>
          <li>태국어 제목·요약도 가능하면 짧게 맞춰 두면 이중 언어 이용자에게 도움이 됩니다.</li>
          <li>
            일괄 승인은 <strong>이미 다듬어진 초안</strong>에만 쓰세요. 짧은 스텁이 섞여 있으면 자동으로 건너뜁니다.
          </li>
        </ul>
      </Section>

      <Section title="2. 꿀팁·지식(태국 생활 정보)">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>한국어 요약</strong> 앞부분은 비회원 <code>/tips</code> 목록에 보이는 <strong>훅</strong>입니다. 궁금증이 생기되, 거짓·
            과장은 금지입니다.
          </li>
          <li>
            원문이 비어 LLM이 스텁만 넣은 경우에는 반드시 <strong>「태자 편집팀·이용자 안내」</strong>에 25자 이상 풀어 쓴 뒤 승인합니다.
          </li>
          <li>비자·법률·금전 관련은 불확실하면 «공식 확인 권장»을 분명히 적고, 체크리스트·주의사항을 비워 두지 않습니다.</li>
          <li>
            승인 전 아래 카드의 <strong>「이용자에게 보이는 본문·발췌 미리보기」</strong>로 광장 글과 같은 형태인지 확인하세요.
          </li>
        </ul>
      </Section>

      <Section title="3. 아침 루틴(추천 순서)">
        <ol style={{ margin: 0, paddingLeft: 22 }}>
          <li>봇 기록·크론이 에러 없이 돌았는지 확인</li>
          <li>지식: 스텁이 있으면 «LLM 재가공» 또는 수동으로 원문 다시 불러오기</li>
          <li>제목·요약·편집 안내 손보기 → 미리보기 확인</li>
          <li>뉴스·지식 각각 일괄 승인(또는 건별 승인)</li>
        </ol>
      </Section>
    </div>
  );
}

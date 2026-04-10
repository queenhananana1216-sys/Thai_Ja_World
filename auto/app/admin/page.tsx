import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from '@/lib/adminAuth';
import { getCharterPreview } from '@/lib/charter/loadCharter';
import { isPipelineLocalOnly } from '@/lib/pipeline/localMode';
import { getConnectedWallet, getSettings, listAudit, listDomains } from '@/lib/store';
import { listPipelineTools } from '@/lib/tools/registry';
import {
  addDomainAction,
  bindWalletAction,
  deleteDomainAction,
  logoutAction,
  manualWatchAction,
  promoteDomainAction,
  setSiteModeAction,
  toggleLockAction,
} from './actions';

export default async function AdminDashboardPage() {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect('/admin/login');
  }

  const [domains, settings, audit, wallet] = await Promise.all([
    listDomains(),
    getSettings(),
    listAudit(30),
    getConnectedWallet(),
  ]);
  const charterPreview = getCharterPreview(900);
  const pipelineTools = listPipelineTools();
  const localOnlyBrain = isPipelineLocalOnly();

  return (
    <main>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>운영 대시보드</h1>
        <form action={logoutAction}>
          <button type="submit" className="secondary">
            로그아웃
          </button>
        </form>
      </div>

      <section className="panel">
        <h2>현재 상태</h2>
        <p>
          모드:{' '}
          <span className={`badge ${settings.siteMode === 'standby' ? 'standby-mode' : 'normal'}`}>
            {settings.siteMode}
          </span>
        </p>
        <p className="muted">
          자동 잠금: {settings.lockAuto ? '켜짐' : '꺼짐'} · 연속 헬스 실패: {settings.consecutiveHealthFailures} · 이상 점수:{' '}
          {settings.anomalyScore}
        </p>
        {settings.cooldownUntil && (
          <p className="muted">쿨다운까지: {new Date(settings.cooldownUntil).toLocaleString()}</p>
        )}
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <form action={setSiteModeAction}>
            <input type="hidden" name="mode" value="normal" />
            <button type="submit" className="secondary">
              정상 모드
            </button>
          </form>
          <form action={setSiteModeAction}>
            <input type="hidden" name="mode" value="standby" />
            <button type="submit">대기(standby) 모드</button>
          </form>
          <form action={toggleLockAction}>
            <input type="hidden" name="lock" value={settings.lockAuto ? '0' : '1'} />
            <button type="submit" className="secondary">
              자동 전환 {settings.lockAuto ? '해제' : '잠금'}
            </button>
          </form>
          <form action={manualWatchAction}>
            <button type="submit" className="secondary">
              헬스 워치 1회
            </button>
          </form>
        </div>
      </section>

      <section className="panel">
        <h2>파이프라인 강령 · 로컬·숨김</h2>
        <p className="muted">
          지침은 저장소 루트 <code>PIPELINE_CHARTER.md</code> 만 편집하면 됩니다. 외부 AI로 보내지 않으려면{' '}
          <code>AUTO_PIPELINE_LOCAL_ONLY=1</code> — 브레인 호출이 꺼지고 규칙 엔진만 동작합니다.
        </p>
        <p className="muted">
          외부 브레인에 강령을 섞으려면(기본 꺼짐) <code>AUTO_BRAIN_INCLUDE_CHARTER=1</code> — 유출 범위를
          스스로 판단하세요.
        </p>
        <p>
          브레인 모드:{' '}
          <span className={`badge ${localOnlyBrain ? 'active' : 'standby'}`}>
            {localOnlyBrain ? '로컬만(클라우드 브레인 끔)' : '클라우드 브레인 허용(키 있을 때)'}
          </span>
        </p>
        <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.35rem' }}>강령 미리보기</h3>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.8rem',
            background: '#0d1117',
            padding: '0.75rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {charterPreview}
        </pre>
        <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.35rem' }}>등록된 도구 (SEO·확장)</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>설명</th>
              <th>태그</th>
            </tr>
          </thead>
          <tbody>
            {pipelineTools.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.id}</code>
                </td>
                <td>{t.description}</td>
                <td className="muted">{(t.tags ?? []).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>AI 두뇌 · 온체인 자동결제</h2>
        <p className="muted">
          크론 <code>/api/cron/watch</code> 가 헬스 HEAD 결과와 도메인 풀을 넣고 Vercel AI Gateway(
          <code>AI_GATEWAY_API_KEY</code>)로 판단합니다. 모델은 <code>AUTO_BRAIN_MODEL</code>(기본{' '}
          <code>openai/gpt-4o</code>) — 게이트웨이에서 더 강한 모델로 교체 가능합니다.
        </p>
        <p className="muted">
          자동결제는 <strong>운영 핫 지갑</strong>(<code>AUTO_PAY_SIGNER_PRIVATE_KEY</code>)에서 수취 주소로
          네이티브 토큰이 나갑니다. 사용자 EOA에서 직접 자동 차감은 ERC20 approve/컨트랙트가 필요합니다.
        </p>
        <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.35rem' }}>등록 지갑(참고·감사)</h3>
        <p className="muted">
          연결해 두면 대시보드에만 표시됩니다. 실제 송금은 위 운영 지갑 환경 변수로 처리합니다.
        </p>
        {wallet.evmAddress ? (
          <p>
            <code>{wallet.evmAddress}</code> · chain {wallet.chainId}
            {wallet.updatedAt && (
              <span className="muted"> · {new Date(wallet.updatedAt).toLocaleString()}</span>
            )}
          </p>
        ) : (
          <p className="muted">등록된 주소 없음</p>
        )}
        <form action={bindWalletAction} className="row" style={{ alignItems: 'flex-end', marginTop: '0.5rem' }}>
          <label style={{ flex: 1, minWidth: 220 }}>
            EVM 주소 (비우면 해제)
            <input name="address" placeholder="0x…" autoComplete="off" />
          </label>
          <label>
            Chain ID
            <input name="chainId" type="number" defaultValue={wallet.chainId} />
          </label>
          <button type="submit">저장</button>
        </form>
      </section>

      <section className="panel">
        <h2>관리자 봇 · 미디어 업로드</h2>
        <p className="muted">
          봇(Nord VPN 전용 IP 등)은 <code>POST /api/bot/ingest</code> 로 파일을 올립니다. 서버는 외부 URL을
          직접 가져오지 않습니다. IP 화이트리스트·MIME·용량은 환경 변수(
          <code>INGEST_*</code>)로 설정하세요.
        </p>
      </section>

      <section className="panel">
        <h2>도메인 풀</h2>
        <p className="muted">Vercel에 미리 연결·검증된 도메인만 승격에 사용하세요.</p>
        <form action={addDomainAction} className="row" style={{ marginBottom: '1rem', alignItems: 'flex-end' }}>
          <label>
            호스트
            <input name="hostname" placeholder="www.example.com" required />
          </label>
          <label>
            우선순위
            <input name="priority" type="number" defaultValue={0} />
          </label>
          <label style={{ flex: 1, minWidth: 180 }}>
            메모
            <input name="note" placeholder="optional" />
          </label>
          <button type="submit">추가</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>호스트</th>
              <th>상태</th>
              <th>우선순위</th>
              <th>메모</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  등록된 도메인이 없습니다.
                </td>
              </tr>
            ) : (
              domains.map((d) => (
                <tr key={d.id}>
                  <td>{d.hostname}</td>
                  <td>
                    <span className={`badge ${d.status}`}>{d.status}</span>
                  </td>
                  <td>{d.priority}</td>
                  <td className="muted">{d.note ?? '—'}</td>
                  <td>
                    <div className="row">
                      <form action={promoteDomainAction}>
                        <input type="hidden" name="hostname" value={d.hostname} />
                        <button type="submit" className="secondary">
                          승격
                        </button>
                      </form>
                      <form action={deleteDomainAction}>
                        <input type="hidden" name="hostname" value={d.hostname} />
                        <button type="submit" className="danger">
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>최근 감사 로그</h2>
        <table>
          <thead>
            <tr>
              <th>시각</th>
              <th>동작</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.at).toLocaleString()}</td>
                <td>{a.action}</td>
                <td>
                  <code>{JSON.stringify(a.detail)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted">
        <Link href="/">홈</Link> · 환경 변수: <code>TAEJA_VERCEL_PROJECT_ID</code>, <code>VERCEL_TOKEN</code>,{' '}
        <code>EDGE_CONFIG_ID</code>, <code>TAEJA_PUBLIC_URL</code>, <code>AI_GATEWAY_API_KEY</code>,{' '}
        <code>AUTO_PAY_*</code>
      </p>
    </main>
  );
}

import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from '@/lib/adminAuth';
import { getAdminEnvChecks } from '@/lib/admin/envStatus';
import { getCharterPreview } from '@/lib/charter/loadCharter';
import { isPipelineLocalOnly } from '@/lib/pipeline/localMode';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';
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
import styles from './admin.module.css';
import { MetaDraftForm } from './MetaDraftForm';

export default async function AdminDashboardPage() {
  const jar = await cookies();
  if (!isAdminCookieValid(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect('/admin/login');
  }

  const [domains, settings, audit, wallet, envChecks] = await Promise.all([
    listDomains(),
    getSettings(),
    listAudit(30),
    getConnectedWallet(),
    Promise.resolve(getAdminEnvChecks()),
  ]);
  const charterPreview = getCharterPreview(900);
  const pipelineTools = listPipelineTools();
  const localOnlyBrain = isPipelineLocalOnly();
  const publicBase = getAutoSiteBaseUrl();
  const seoOk = envChecks.filter((e) => e.role === 'seo').every((e) => e.ok);
  const secOk = envChecks.filter((e) => e.role === 'security').every((e) => e.ok);

  return (
    <main>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>운영 콘솔</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
            SEO·검색 노출과 보안(엣지·시크릿·크론)을 우선 — 아래에서 현황 점검 후 수정은 각 블록에서.
          </p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="secondary">
            로그아웃
          </button>
        </form>
      </div>

      <nav className={styles.toc} aria-label="섹션 이동">
        <a href="#overview">한눈에</a>
        <span className={styles.tocSep}>|</span>
        <a href="#ops">운영·헬스</a>
        <span className={styles.tocSep}>|</span>
        <a href="#seo">SEO·메타</a>
        <span className={styles.tocSep}>|</span>
        <a href="#pipeline">파이프라인</a>
        <span className={styles.tocSep}>|</span>
        <a href="#security">보안·엣지</a>
        <span className={styles.tocSep}>|</span>
        <a href="#domains">도메인</a>
        <span className={styles.tocSep}>|</span>
        <a href="#ai">AI·체인</a>
        <span className={styles.tocSep}>|</span>
        <a href="#bot">봇</a>
        <span className={styles.tocSep}>|</span>
        <a href="#audit">감사</a>
        <span className={styles.tocSep}>|</span>
        <Link href="/">공개 허브 ↗</Link>
      </nav>

      {/* ── 한눈에: 현황 + 환경 키(설정 여부만) ── */}
      <section className="panel" id="overview">
        <h2>한눈에 · 현황</h2>
        <p className={styles.lede}>
          <strong>공개 URL(메타·canonical)</strong>:{' '}
          <code className={styles.pubUrl}>{publicBase}</code> — 검색·SNS 미리보기는 이 베이스를 기준으로 맞춥니다.
        </p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          SEO 키 요약:{' '}
          {seoOk ? <span className={styles.pillOk}>공개 URL OK</span> : <span className={styles.pillBad}>공개 URL 확인</span>}{' '}
          · 보안 키 요약:{' '}
          {secOk ? <span className={styles.pillOk}>핵심 시크릿 OK</span> : <span className={styles.pillBad}>시크릿 보강 권장</span>}
        </p>
        <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>환경 변수 (값 비공개 · 설정 여부만)</h3>
        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th>역할</th>
              <th>상태</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {envChecks.map((row) => (
              <tr key={row.key}>
                <td>
                  <code>{row.key}</code>
                  <div className={styles.envHint}>{row.label}</div>
                </td>
                <td>
                  <span className={styles.roleTag}>{row.role}</span>
                </td>
                <td>{row.ok ? <span className={styles.pillOk}>설정됨</span> : <span className={styles.pillBad}>미설정</span>}</td>
                <td className="muted" style={{ fontSize: '0.82rem' }}>
                  {row.hint}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" id="ops">
        <h2>운영 · 헬스 · 모드</h2>
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

      <section className="panel" id="seo">
        <h2>SEO · 메타 초안 · 외장 메모리</h2>
        <p className="muted">
          키워드·상위 노출은 <strong>기술 SEO</strong>(canonical·메타·구조화 데이터·사이트맵)와{' '}
          <strong>콘텐츠·키워드 의도</strong>가 함께 가야 합니다. 아래 초안은 외장 메모리·로컬 AI로만 생성 —{' '}
          <strong>배포 전 태자 i18n·브랜드 검수</strong>가 필수입니다.
        </p>
        <ul className={styles.checklist}>
          <li>
            <code>NEXT_PUBLIC_AUTO_SITE_URL</code> 로 공개 베이스 고정 → OG·canonical 일치.
          </li>
          <li>링크 허브 본문은 실제 도메인만; 스팸·도어웨이 링크 금지.</li>
          <li>Search Console·사이트맵 제출은 태자 월드·이 프로젝트 배포 설정과 함께 점검.</li>
        </ul>
        <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.5rem' }}>메타 초안 실행</h3>
        <MetaDraftForm />
      </section>

      <section className="panel" id="pipeline">
        <h2>파이프라인 · 강령 · 등록 도구</h2>
        <p className="muted">
          지침은 저장소 <code>PIPELINE_CHARTER.md</code> 만 편집. 외부 AI로 안 보내려면{' '}
          <code>AUTO_PIPELINE_LOCAL_ONLY=1</code>. 강령을 브레인 프롬프트에 넣으려면{' '}
          <code>AUTO_BRAIN_INCLUDE_CHARTER=1</code> (유출 범위 판단 필요).
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
        <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.35rem' }}>등록된 도구</h3>
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

      <section className="panel" id="security">
        <h2>보안 · Cloudflare · 엣지 · 크론</h2>
        <p className="muted">
          원칙: <strong>오리진 직접 노출 최소화</strong>, <strong>비밀은 환경 변수</strong>,{' '}
          <strong>크론·봇은 시크릿 + (가능하면) IP 제한</strong>.
        </p>
        <ul className={styles.checklist}>
          <li>
            <strong>Cloudflare</strong>: DNS 프록시(주황 구름), WAF·봇 방어, 레이트 리밋. SSL/TLS Full(strict) 권장.
          </li>
          <li>
            <strong>터널(Cloudflare Tunnel 등)</strong>: 개발·비공개 오리진 노출 시 터널로만 붙이고, 공개 DNS는 CF에만 두기.
          </li>
          <li>
            <strong>Vercel</strong>: 이 앱은 서버리스 — 민감 엔드포인트는 <code>CRON_SECRET</code>·관리자 쿠키로 이중 확인.
          </li>
          <li>
            <strong>봇 업로드</strong>: <code>INGEST_BOT_SECRET</code> + <code>INGEST_IP_ALLOWLIST</code>(Nord 전용 IP 등) 병행.
          </li>
          <li>
            <strong>SSRF 방지</strong>: 서버가 사용자 URL로 임의 fetch 하지 않음 — 설계 유지.
          </li>
        </ul>
      </section>

      <section className="panel" id="ai">
        <h2>AI 두뇌 · 온체인 자동결제</h2>
        <p className="muted">
          크론 <code>/api/cron/watch</code> 가 헬스·도메인 풀을 넣고 AI Gateway(<code>AI_GATEWAY_API_KEY</code>)로 판단합니다. 모델:{' '}
          <code>AUTO_BRAIN_MODEL</code>.
        </p>
        <p className="muted">
          자동결제는 운영 핫 지갑(<code>AUTO_PAY_SIGNER_PRIVATE_KEY</code>)에서만 — 사용자 지갑 자동 차감은 별도 컨트랙트 설계 필요.
        </p>
        <h3 style={{ fontSize: '0.95rem', margin: '0.75rem 0 0.35rem' }}>등록 지갑(참고·감사)</h3>
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

      <section className="panel" id="bot">
        <h2>관리자 봇 · 미디어 업로드</h2>
        <p className="muted">
          <code>POST /api/bot/ingest</code> — <code>Authorization: Bearer</code> + (선택) IP 화이트리스트. MIME·용량:{' '}
          <code>INGEST_*</code>.
        </p>
      </section>

      <section className="panel" id="domains">
        <h2>도메인 풀</h2>
        <p className="muted">Vercel에 연결·검증된 호스트만 승격에 사용.</p>
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

      <section className="panel" id="audit">
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

      <p className="muted" style={{ fontSize: '0.8rem' }}>
        참고 키: <code>TAEJA_VERCEL_PROJECT_ID</code>, <code>VERCEL_TOKEN</code>, <code>EDGE_CONFIG_ID</code>,{' '}
        <code>TAEJA_PUBLIC_URL</code>, <code>AI_GATEWAY_API_KEY</code>, <code>AUTO_PAY_*</code>,{' '}
        <code>MEMORY_STORE_PATH</code>, <code>LOCAL_AI_*</code>
      </p>
    </main>
  );
}

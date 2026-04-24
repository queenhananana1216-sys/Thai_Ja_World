import Link from 'next/link';
import type { CommunityPulse, PulseItem } from '@/lib/landing/fetchCommunityPulse';
import type { RecentPostItem } from '@/lib/landing/fetchRecentPosts';
import type { LandingQuestStrip } from '@/lib/landing/fetchLandingQuestStrip';
import type { Locale } from '@/i18n/types';

type Props = {
  locale: Locale;
  pulse: CommunityPulse;
  recent: RecentPostItem[];
  questStrip: LandingQuestStrip;
};

function colByLabel(pulse: CommunityPulse, th: string, ko: string) {
  return (
    pulse.columns.find((c) => c.label === th || c.label === ko) ?? {
      label: ko,
      accent: 'sky' as const,
      moreHref: '/',
      items: [] as PulseItem[],
      todayCount: 0,
    }
  );
}

function relTime(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return locale === 'th' ? `${day} วัน` : `${day}일 전`;
  if (hr >= 1) return locale === 'th' ? `${hr} ชม.` : `${hr}시간 전`;
  if (min >= 1) return locale === 'th' ? `${min} นาที` : `${min}분 전`;
  return locale === 'th' ? 'เมื่อสักครู่' : '방금 전';
}

function StatBadge({
  commentCount,
  viewCount,
  locale,
}: {
  commentCount: number | null;
  viewCount: number | null;
  locale: Locale;
}) {
  const c = typeof commentCount === 'number' && commentCount > 0 ? commentCount : null;
  const v = typeof viewCount === 'number' && viewCount > 0 ? viewCount : null;
  if (c == null && v == null) return null;
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: '#7dd3fc',
        minWidth: 0,
      }}
    >
      {c != null ? <span title="comments">{locale === 'th' ? `${c}` : `댓${c}`}</span> : null}
      {v != null ? <span title="views">{locale === 'th' ? `วิว${v}` : `조${v}`}</span> : null}
    </span>
  );
}

function DenseRow({ item, locale }: { item: PulseItem; locale: Locale }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      className="tj-portal-dense-row"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        color: '#e2e8f0',
        fontSize: 12.5,
        lineHeight: 1.4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </span>
      <StatBadge commentCount={item.commentCount} viewCount={item.viewCount} locale={locale} />
    </Link>
  );
}

function ListBlock({
  title,
  moreHref,
  moreLabel,
  items,
  locale,
  emptyHint,
}: {
  title: string;
  moreHref: string;
  moreLabel: string;
  items: PulseItem[];
  locale: Locale;
  emptyHint: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,17,40,0.65)',
        borderRadius: 14,
        padding: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
          paddingInline: 2,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </h3>
        <Link
          href={moreHref}
          prefetch={false}
          style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600, textDecoration: 'none' }}
        >
          {moreLabel}
        </Link>
      </div>
      {items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((it) => (
            <DenseRow key={`${title}-${it.id}`} item={it} locale={locale} />
          ))}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            padding: '8px 6px 2px',
            fontSize: 12,
            color: '#94a3b8',
            lineHeight: 1.45,
          }}
        >
          {emptyHint}
        </p>
      )}
    </div>
  );
}

/**
 * 히어로 직후 Philgo 느낌의 3열 포털 — 이미 `fetchCommunityPulse`·`fetchRecentPosts`·퀘스트(099 RLS) 데이터만 사용.
 */
export function LandingPortalHighlights({ locale, pulse, recent, questStrip }: Props) {
  const news = colByLabel(pulse, 'ข่าวสาร', '뉴스');
  const tips = colByLabel(pulse, 'เคล็ดลับ', '정보·꿀팁');
  const free = colByLabel(pulse, 'พูดคุย', '자유토론');
  const question = colByLabel(pulse, 'ถามตอบ', '질문답변');
  const restaurant = colByLabel(pulse, 'ร้านแนะนำ', '동네·맛집');

  const spotlight = news.items[0];
  const newsRest = news.items.slice(1, 6);
  const tipsS = tips.items.slice(0, 5);
  const freeS = free.items.slice(0, 5);
  const recentLeft = recent.slice(0, 6);
  const recentRight = recent.slice(6, 12);

  const kicker = 'LANDING HUB';
  const title = locale === 'th' ? 'อัปเดตล่าสุดจากทั้งระบบ' : '최신 흐름 · 한 화면 요약';
  const sub =
    locale === 'th'
      ? 'รวมลิงก์จริงจากข่าว · คำแนะนำ · กระดาน — อัตโนมัติโดยไปป์ไลน์'
      : '뉴스·꿀팁·광장 글을 실제 파이프라인 데이터로 이어서 보여줍니다.';
  const more = locale === 'th' ? 'อื่น ๆ →' : '전체 →';
  const noNews = locale === 'th' ? 'รอรายการข่าว — อัปเดตเร็ว ๆ นี้' : '뉴스를 불러오는 중이거나 아직 없습니다. `/news`에서 전체를 확인하세요.';

  const questDegraded = questStrip.kind === 'ok' && questStrip.degraded;
  const showQuestSignIn = questStrip.kind === 'signed_out';
  const showQuestEmptySignedIn =
    questStrip.kind === 'ok' && !questStrip.degraded && questStrip.items.length === 0;

  return (
    <section
      aria-labelledby="tj-landing-portal"
      style={{
        marginTop: 28,
        marginBottom: 4,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.1em',
            fontWeight: 700,
            color: '#a5b4fc',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </p>
        <h2
          id="tj-landing-portal"
          style={{
            margin: '6px 0 4px',
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', maxWidth: 720, lineHeight: 1.5 }}>{sub}</p>
        {pulse.degraded ? (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f87171' }}>
            {locale === 'th' ? 'บางคอลัมน์โหลดไม่สมบูรณ์' : '일부 컬럼만 불러올 수 있었습니다.'}
          </p>
        ) : null}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .tj-portal-dense-row:hover { background: rgba(255,255,255,0.06); }
            .tj-portal-dense-row:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 1px; }
            .tj-landing-portal-grid {
              display: grid;
              gap: 12px;
              grid-template-columns: minmax(0,1fr);
            }
            @media (min-width: 1024px) {
              .tj-landing-portal-grid {
                grid-template-columns: 1.15fr 1fr 0.9fr;
                gap: 14px;
                align-items: start;
              }
            }
            .tj-portal-2up {
              display: grid;
              gap: 10px;
              grid-template-columns: minmax(0,1fr);
            }
            @media (min-width: 640px) {
              .tj-portal-2up { grid-template-columns: repeat(2, minmax(0,1fr)); }
            }
          `,
        }}
      />

      <div className="tj-landing-portal-grid">
        {/* A: 뉴스 스포트 + 리스트 */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(160deg, rgba(30,27,75,0.5), rgba(15,17,40,0.9))',
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#bae6fd' }}>{news.label}</span>
              <Link
                href={news.moreHref}
                prefetch={false}
                style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 600, textDecoration: 'none' }}
              >
                {more}
              </Link>
            </div>
            {spotlight ? (
              <Link
                href={spotlight.href}
                prefetch={false}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 10,
                  padding: '10px 8px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: 15,
                    lineHeight: 1.35,
                    fontWeight: 800,
                    color: '#f1f5f9',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}
                >
                  {spotlight.title}
                </h3>
                {spotlight.subtitle ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: '#94a3b8',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}
                  >
                    {spotlight.subtitle}
                  </p>
                ) : null}
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
                  <time dateTime={spotlight.createdAt ?? undefined}>
                    {relTime(spotlight.createdAt, locale)}
                  </time>
                </p>
              </Link>
            ) : (
              <div
                style={{
                  borderRadius: 10,
                  padding: '12px 10px',
                  fontSize: 12.5,
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  border: '1px dashed rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {noNews}{' '}
                <Link href="/news" prefetch={false} style={{ color: '#7dd3fc' }}>
                  {locale === 'th' ? 'ไปหน้าข่าว' : '뉴스 허브로'}
                </Link>
              </div>
            )}
            {newsRest.length > 0 ? (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' }}>
                {newsRest.map((it) => (
                  <DenseRow key={it.id} item={it} locale={locale} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* B: 2x2 + 작은 2행 */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="tj-portal-2up">
            <ListBlock
              title={tips.label}
              moreHref={tips.moreHref}
              moreLabel={more}
              items={tipsS}
              locale={locale}
              emptyHint={locale === 'th' ? 'รอเนื้อหาเคล็ดลับ' : '꿀팁이 아직 없거나 곧 올라옵니다.'}
            />
            <ListBlock
              title={free.label}
              moreHref={free.moreHref}
              moreLabel={more}
              items={freeS}
              locale={locale}
              emptyHint={locale === 'th' ? 'รอโพสต์' : '자유 게시글이 없습니다.'}
            />
          </div>
          <div className="tj-portal-2up">
            <ListBlock
              title={question.label}
              moreHref={question.moreHref}
              moreLabel={more}
              items={question.items.slice(0, 4)}
              locale={locale}
              emptyHint={locale === 'th' ? 'ยังไม่มีคำถาม' : '질문이 아직 없습니다.'}
            />
            <ListBlock
              title={restaurant.label}
              moreHref={restaurant.moreHref}
              moreLabel={more}
              items={restaurant.items.slice(0, 4)}
              locale={locale}
              emptyHint={locale === 'th' ? 'รอร้าน' : '맛집 글이 곧 쌓입니다.'}
            />
          </div>
        </div>

        {/* C: 광장 최신 + 퀘스트 */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(15,17,40,0.7)',
              borderRadius: 14,
              padding: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                paddingInline: 2,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                {locale === 'th' ? 'กระดาน (ล่าสุด)' : '광장 최신'}
              </h3>
              <Link
                href="/community/boards"
                prefetch={false}
                style={{ fontSize: 11, color: '#f9a8d4', fontWeight: 700, textDecoration: 'none' }}
              >
                {more}
              </Link>
            </div>
            {recent.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', padding: '4px 4px 2px' }}>
                {locale === 'th' ? 'ยังไม่มีโพสต์' : '게시글이 아직 없습니다. 광장 전체는 커뮤니티 메뉴에서.'}
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentLeft.map((p) => {
                    const href =
                      p.category === 'info' && p.isKnowledgeTip ? `/tips/${p.id}` : `/community/boards/${p.id}`;
                    return (
                      <Link
                        key={p.id}
                        href={href}
                        prefetch={false}
                        className="tj-portal-dense-row"
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 8,
                          padding: '6px 6px',
                          textDecoration: 'none',
                          color: '#e2e8f0',
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {p.title}
                        </span>
                        <StatBadge
                          commentCount={p.commentCount > 0 ? p.commentCount : null}
                          viewCount={p.viewCount > 0 ? p.viewCount : null}
                          locale={locale}
                        />
                      </Link>
                    );
                  })}
                </div>
                {recentRight.length > 0 ? (
                  <div
                    style={{
                      marginTop: 4,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      paddingTop: 2,
                    }}
                  >
                    {recentRight.map((p) => {
                      const href =
                        p.category === 'info' && p.isKnowledgeTip ? `/tips/${p.id}` : `/community/boards/${p.id}`;
                      return (
                        <Link
                          key={`b-${p.id}`}
                          href={href}
                          prefetch={false}
                          className="tj-portal-dense-row"
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 8,
                            padding: '6px 6px',
                            textDecoration: 'none',
                            color: '#e2e8f0',
                            fontSize: 12.5,
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                            }}
                          >
                            {p.title}
                          </span>
                          <StatBadge
                            commentCount={p.commentCount > 0 ? p.commentCount : null}
                            viewCount={p.viewCount > 0 ? p.viewCount : null}
                            locale={locale}
                          />
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            style={{
              border: '1px solid rgba(196,181,253,0.2)',
              background: 'rgba(15,17,40,0.6)',
              borderRadius: 14,
              padding: 10,
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: '#e9d5ff' }}>
              {locale === 'th' ? 'เควสรายวัน' : '오늘의 퀘스트'}
            </h3>
            {questDegraded ? (
              <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>
                {locale === 'th' ? 'โหลดเควสไม่สมบูรณ์' : '퀘스트 정의를 잠시 불러오지 못했습니다.'}
              </p>
            ) : null}
            {questStrip.kind === 'ok' && questStrip.items.length > 0 ? (
              <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.55 }}>
                {questStrip.items.map((q) => {
                  const meta: string[] = [];
                  if (q.goal > 0) meta.push(locale === 'th' ? `เป้า ${q.goal}` : `목표 ${q.goal}`);
                  if (q.rewardCorn > 0) meta.push(locale === 'th' ? `+${q.rewardCorn}` : `+${q.rewardCorn}`);
                  return (
                    <li key={q.questCode} style={{ marginBottom: 4 }}>
                      {q.title}
                      {meta.length ? (
                        <span style={{ color: '#94a3b8', fontSize: 11 }}> ({meta.join(' · ')})</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {showQuestEmptySignedIn ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {locale === 'th' ? 'ยังไม่มีรายการเควสรายวัน' : '표시할 일일 퀘스트가 아직 없습니다.'}
              </p>
            ) : null}
            {showQuestSignIn ? (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {locale === 'th'
                  ? 'ล็อกอินแล้วจะเห็นรายการเควสฐานที่รองรับในบัญชี'
                  : '로그인하면 일일 퀘스트(계정·RLS) 요약이 여기에 붙습니다.'}
              </p>
            ) : null}
            {showQuestSignIn ? (
              <Link
                href="/auth/login?next=%2Flanding"
                style={{
                  display: 'inline-block',
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#0f172a',
                  textDecoration: 'none',
                  background: 'linear-gradient(120deg,#c4b5fd,#f9a8d4)',
                  borderRadius: 10,
                  padding: '8px 12px',
                }}
              >
                {locale === 'th' ? 'เข้าสู่ระบบ' : '로그인'}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

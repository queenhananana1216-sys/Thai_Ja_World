import 'server-only';

import type { NewsSlackDigestItem } from './summarizeAndPersistNews';
import { postSlackIncomingWebhook } from '@/lib/slack/slackIncomingWebhook';

const MAX_TEXT = 38_000;
const MAX_SUMMARY_PER_ITEM = 1_800;

function formatDigest(items: NewsSlackDigestItem[]): string {
  const header = `태자월드 뉴스 요약 (${items.length}건)\n`;
  const blocks = items.map((it, i) => {
    const title = it.ko_title.trim();
    let body = it.ko_summary.trim();
    if (body.length > MAX_SUMMARY_PER_ITEM) {
      body = `${body.slice(0, MAX_SUMMARY_PER_ITEM)}…`;
    }
    const urlLine = it.source_url?.trim() ? `\n원문: ${it.source_url}` : '';
    return `【${i + 1}】 ${title}\n${body}${urlLine}`;
  });
  let text = `${header}\n${blocks.join('\n\n─── 다음 기사 ───\n\n')}`;
  if (text.length > MAX_TEXT) {
    text = `${text.slice(0, MAX_TEXT - 20)}\n\n…(생략)`;
  }
  return text;
}

/**
 * NEWS_SUMMARY_SLACK_WEBHOOK_URL 이 있을 때만 전송 (hooks.slack.com 만 허용).
 * 셀프힐 알림용 SLACK_WEBHOOK_URL 과 분리해 두는 것을 권장.
 */
export async function sendNewsSummarySlackDigest(
  items: NewsSlackDigestItem[] | undefined,
): Promise<void> {
  if (!items?.length) return;
  const url = process.env.NEWS_SUMMARY_SLACK_WEBHOOK_URL?.trim();
  if (!url) return;

  const text = formatDigest(items);
  const r = await postSlackIncomingWebhook(url, { text });
  if (!r.ok) {
    console.warn(
      '[NewsSlack] 전송 실패:',
      r.status,
      r.error ?? '',
    );
  }
}

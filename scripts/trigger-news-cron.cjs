/**
 * Production news cron trigger.
 * Run from repository root: node scripts/trigger-news-cron.cjs
 *
 * Default: sync=1 (동기 가공, HTTP 200 + process 결과). after() deferred_queued 정체 회피.
 * Override: NEWS_CRON_DEFERRED=1 → 비동기 202 + job_id 폴링.
 *
 * CRON_SECRET in .env.docker should be double-quoted if it contains #, $, ', or \.
 */
const fs = require("node:fs");
const path = require("node:path");

const ENV_DOCKER_PATH = "F:/02_Master_Keys/API_JSON/.env.docker";
const SITE_ORIGIN = "https://www.thaijaworld.com";
const ITEMS_PER_FEED = process.env.NEWS_CRON_ITEMS_PER_FEED || "12";
const PROCESS_LIMIT = process.env.NEWS_CRON_PROCESS_LIMIT || "10";
const USE_DEFERRED = process.env.NEWS_CRON_DEFERRED === "1";
const CRON_NEWS_PATH = USE_DEFERRED
  ? `/api/cron/news?itemsPerFeed=${ITEMS_PER_FEED}&limit=${PROCESS_LIMIT}`
  : `/api/cron/news?sync=1&itemsPerFeed=${ITEMS_PER_FEED}&limit=${PROCESS_LIMIT}`;
const POLL_PATH_BASE = "/api/cron/news?status=1";
const SYNC_FETCH_MS = Number(process.env.NEWS_CRON_SYNC_TIMEOUT_MS || "360000");

if (!fs.existsSync(ENV_DOCKER_PATH)) {
  console.error(`[trigger-news-cron] Env file not found: ${ENV_DOCKER_PATH}`);
  process.exit(1);
}

let dotenv;
try {
  dotenv = require(require.resolve("dotenv", { paths: [path.join(__dirname, "..")] }));
} catch {
  console.error(
    "[trigger-news-cron] MODULE_NOT_FOUND: install deps from repo root (npm install).",
  );
  process.exit(1);
}

const parsed = dotenv.config({ path: ENV_DOCKER_PATH });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
if (parsed.error) {
  console.error("[trigger-news-cron] dotenv parse error:", parsed.error.message);
  process.exit(1);
}

const PURGE_STUBS = process.argv.includes("--purge-stubs") || process.env.PURGE_STUBS === "1";
const VERIFY_PUBLISHED = process.argv.includes("--verify") || process.env.NEWS_CRON_VERIFY === "1";

const secret = (
  process.env.CRON_SECRET ||
  process.env.BOT_CRON_SECRET ||
  ""
).trim();

if (!secret) {
  console.error(
    "[trigger-news-cron] CRON_SECRET / BOT_CRON_SECRET is empty after load. Check quoting in .env.docker for \\ $ '",
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 0;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text };
    }
    return { res, text, json };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function purgeStubRowsFromDb() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    console.warn("[trigger-news-cron] --purge-stubs: SUPABASE_SERVICE_ROLE_KEY missing, skip");
    return;
  }
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const newsOr =
    "title_kr.ilike.%placeholder%,title_kr.ilike.%TBD%,title_kr.ilike.%coming soon%," +
    "content_kr.ilike.%placeholder%,title_kr.ilike.%\uB0B4\uC6A9 \uC900\uBE44%,title_kr.ilike.%\uAC00\uACF5 \uC804%," +
    "title_kr.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%,title_kr.ilike.%\uAC31\uC2E0\uC740 \uC815\uB9D0 \uC5B4\uB835%," +
    "content_kr.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%";
  const knowOr =
    "clean_body.ilike.%placeholder%,clean_body.ilike.%TBD%,clean_body.ilike.%\uB0B4\uC6A9 \uC900\uBE44%," +
    "clean_body.ilike.%\uBE44\uC790%\uAC31\uC2E0%\uC5B4\uB835%";
  for (const [table, orFilter] of [
    ["processed_news", newsOr],
    ["processed_knowledge", knowOr],
  ]) {
    const { data, error } = await sb.from(table).delete().or(orFilter).select("id");
    if (error) throw new Error(`purge ${table}: ${error.message}`);
    console.log(`[trigger-news-cron] purge ${table}: deleted ${data?.length ?? 0}`);
  }
}

async function logTodayPublishedCount() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return;
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { data, count, error } = await sb
    .from("processed_news")
    .select("id, title_kr, published", { count: "exact" })
    .eq("published", true)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    console.warn("[trigger-news-cron] verify:", error.message);
    return;
  }
  console.log(`[trigger-news-cron] today published=true count=${count ?? 0}`);
  for (const row of data ?? []) {
    console.log(`  published ${row.id.slice(0, 8)}… ${(row.title_kr || "").slice(0, 72)}`);
  }
}

function logSyncProcessResult(json) {
  const proc = json?.process;
  if (!proc || typeof proc !== "object") return;
  const out = proc.output ?? proc;
  const results = out?.results ?? [];
  const succeeded = out?.succeeded ?? results.filter((r) => r.ok).length;
  const failed = out?.failed ?? results.filter((r) => !r.ok).length;
  console.log(
    `\n[trigger-news-cron] process: succeeded=${succeeded} failed=${failed} (total results=${results.length})`,
  );
  for (const r of results.slice(0, 15)) {
    const pub = r.published === true ? "published=true" : r.published === false ? "published=false" : "";
    const pid = r.processed_news_id ? ` id=${r.processed_news_id.slice(0, 8)}…` : "";
    console.log(
      `  raw=${r.raw_news_id?.slice(0, 8) ?? "?"}… ok=${r.ok} ${pub}${pid}${r.error ? ` err=${String(r.error).slice(0, 120)}` : ""}`,
    );
  }
}

async function main() {
  if (PURGE_STUBS) {
    console.log("[trigger-news-cron] --purge-stubs: deleting stub rows…");
    await purgeStubRowsFromDb();
  }
  console.log(
    `[trigger-news-cron] mode=${USE_DEFERRED ? "deferred(202+poll)" : "sync(200)"} path=${CRON_NEWS_PATH}`,
  );
  const cronUrl = `${SITE_ORIGIN}${CRON_NEWS_PATH}`;
  const first = await fetchJson(cronUrl, {
    timeoutMs: USE_DEFERRED ? 120_000 : SYNC_FETCH_MS,
  });
  console.log("HTTP", first.res.status, first.res.status === 202 ? "ACCEPTED(deferred)" : first.res.ok ? "OK" : "(not OK)");
  console.log(JSON.stringify(first.json, null, 2).slice(0, 3500));
  if (!USE_DEFERRED && first.res.ok && first.json?.status === "ok") {
    logSyncProcessResult(first.json);
  }

  if (!first.res.ok && first.res.status !== 202) {
    if (first.res.status === 401) {
      console.error(
        "[trigger-news-cron] 401 Unauthorized — Vercel Production CRON_SECRET 과 .env.docker CRON_SECRET 이 동일한지 확인하세요.",
      );
    }
    process.exit(1);
  }

  if (first.res.status === 202 && first.json && first.json.job_id) {
    const jobId = String(first.json.job_id);
    /** maxDuration 300s + 큐 지연 대비 — 최대 10분 폴링 */
    const deadline = Date.now() + 600_000;
    let last = null;
    let tick = 0;
    while (Date.now() < deadline) {
      await sleep(5000);
      tick += 1;
      const pollUrl = `${SITE_ORIGIN}${POLL_PATH_BASE}&job_id=${encodeURIComponent(jobId)}`;
      const poll = await fetchJson(pollUrl);
      last = poll.json;
      const recentN = Array.isArray(poll.json?.recent) ? poll.json.recent.length : 0;
      const modes = Array.isArray(poll.json?.recent)
        ? poll.json.recent.map((r) => r?.meta?.mode).filter(Boolean)
        : [];
      console.log(
        `[poll #${tick}] ${new Date().toISOString()} recent=${recentN} modes=${JSON.stringify(modes.slice(0, 5))}`,
      );
      const done = poll.json?.recent?.find(
        (r) =>
          r.meta &&
          r.meta.job_id === jobId &&
          (r.meta.mode === "deferred_done" || r.meta.mode === "deferred_error"),
      );
      if (done) {
        console.log("\n--- poll: terminal state ---\n", JSON.stringify(done, null, 2).slice(0, 4000));
        if (done.meta.mode === "deferred_error") {
          process.exit(1);
        }
        process.exit(0);
      }
      process.stdout.write(".");
    }
    const snap = JSON.stringify(last, null, 2).slice(0, 2000);
    console.error(
      "\n[trigger-news-cron] poll timeout (10m). Last snapshot:",
      snap,
      "\nHint: recent가 비면 Vercel에 최신 main 배포(Redeploy) 후 재실행 — publish_logs UUID 수정 반영 필요.",
    );
    process.exit(1);
  }

  if (!first.res.ok) process.exit(1);
  if (VERIFY_PUBLISHED || (!USE_DEFERRED && first.res.ok)) {
    await logTodayPublishedCount();
  }
}

main().catch((err) => {
  console.error("[trigger-news-cron]", err);
  process.exit(1);
});

/**
 * Production news cron smoke trigger.
 * Run from repository root: node scripts/trigger-news-cron.cjs
 *
 * Vercel에서는 `/api/cron/news`가 기본 비동기(202)이므로 job_id 폴링으로 완료를 확인합니다.
 *
 * CRON_SECRET in .env.docker should be double-quoted if it contains #, $, ', or \.
 */
const fs = require("node:fs");
const path = require("node:path");

const ENV_DOCKER_PATH = "F:/02_Master_Keys/API_JSON/.env.docker";
const SITE_ORIGIN = "https://www.thaijaworld.com";
const CRON_NEWS_PATH = "/api/cron/news?itemsPerFeed=12&limit=10";
const POLL_PATH_BASE = "/api/cron/news?status=1";

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
if (parsed.error) {
  console.error("[trigger-news-cron] dotenv parse error:", parsed.error.message);
  process.exit(1);
}

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

async function fetchJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  return { res, text, json };
}

async function main() {
  const cronUrl = `${SITE_ORIGIN}${CRON_NEWS_PATH}`;
  const first = await fetchJson(cronUrl);
  console.log("HTTP", first.res.status, first.res.status === 202 ? "ACCEPTED(deferred)" : first.res.ok ? "OK" : "(not OK)");
  console.log(JSON.stringify(first.json, null, 2).slice(0, 3500));

  if (!first.res.ok && first.res.status !== 202) {
    process.exit(1);
  }

  if (first.res.status === 202 && first.json && first.json.job_id) {
    const jobId = String(first.json.job_id);
    /** 파이프라인 maxDuration(300s) + 여유 — 너무 짧으면 deferred_done 전에 타임아웃 */
    const deadline = Date.now() + 420_000;
    let last = null;
    while (Date.now() < deadline) {
      await sleep(5000);
      const pollUrl = `${SITE_ORIGIN}${POLL_PATH_BASE}&job_id=${encodeURIComponent(jobId)}`;
      const poll = await fetchJson(pollUrl);
      last = poll.json;
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
      "\n[trigger-news-cron] poll timeout (~7m). Last snapshot:",
      snap,
      "\nHint: recent가 비면 Vercel에 최신 main 배포(Redeploy) 후 재실행 — publish_logs UUID 수정 반영 필요.",
    );
    process.exit(1);
  }

  if (!first.res.ok) process.exit(1);
}

main().catch((err) => {
  console.error("[trigger-news-cron]", err);
  process.exit(1);
});

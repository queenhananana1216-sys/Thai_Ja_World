/**
 * Production news cron smoke trigger.
 * Run from repository root: node scripts/trigger-news-cron.cjs
 *
 * CRON_SECRET in .env.docker should be double-quoted if it contains #, $, ', or \.
 * Example: CRON_SECRET="...\\z$..." — see dotenv v17 docs for escaping.
 */
const fs = require("node:fs");
const path = require("node:path");

const ENV_DOCKER_PATH = "F:/02_Master_Keys/API_JSON/.env.docker";
const CRON_URL =
  "https://www.thaijaworld.com/api/cron/news?itemsPerFeed=10&limit=3";

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

async function main() {
  const res = await fetch(CRON_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  const ok = res.ok;
  console.log("HTTP", res.status, ok ? "OK" : "(not OK)");
  console.log(text.slice(0, 2500));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("[trigger-news-cron]", err);
  process.exit(1);
});

const https = require("node:https");
const { URL } = require("node:url");
require("dotenv").config({ path: "F:/02_Master_Keys/API_JSON/.env.docker" });

const secret =
  process.env.CRON_SECRET || process.env.BOT_CRON_SECRET || "";
if (!secret) {
  console.error("Missing CRON_SECRET / BOT_CRON_SECRET in master env file.");
  process.exit(1);
}

const u = new URL("https://www.thaijaworld.com/api/cron/news");
u.searchParams.set("itemsPerFeed", "8");
u.searchParams.set("limit", "1");

const req = https.request(
  u,
  {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
    timeout: 180_000,
  },
  (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      console.log("HTTP", res.statusCode);
      console.log(text.slice(0, 2000));
    });
  }
);

req.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

req.end();

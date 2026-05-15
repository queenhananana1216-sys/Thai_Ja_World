const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const dotenv = require("dotenv");

const localEnv = resolve(process.cwd(), ".env.local");
if (!existsSync(localEnv)) {
  console.error("[vercel-env-supabase] Missing .env.local");
  process.exit(1);
}
dotenv.config({ path: localEnv });

const entries = [
  ["NEXT_PUBLIC_SUPABASE_URL", (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(), false],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(), true],
  ["SUPABASE_SERVICE_ROLE_KEY", (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(), true],
];

for (const [name, val] of entries) {
  if (!val) {
    console.error(`[vercel-env-supabase] ${name} is empty in .env.local`);
    process.exit(1);
  }
}

function run(args, input) {
  return spawnSync("npx", ["vercel", ...args], {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32",
  });
}

function pushOne(name, value, sensitive) {
  const rm = run(["env", "rm", name, "production", "--yes"]);
  if (rm.status !== 0 && rm.stderr) {
    console.warn(`[vercel-env-supabase] rm ${name}:`, rm.stderr.slice(0, 200));
  }
  const addArgs = ["env", "add", name, "production", "--force", "--yes"];
  if (sensitive) addArgs.push("--sensitive");
  const add = run(addArgs, `${value}\n`);
  if (add.stdout) process.stdout.write(add.stdout);
  if (add.stderr) process.stderr.write(add.stderr);
  if (add.status !== 0) {
    console.error(`[vercel-env-supabase] add ${name} exit`, add.status);
    process.exit(add.status ?? 1);
  }
  console.log(`[vercel-env-supabase] set ${name}`);
}

for (const [name, val, sensitive] of entries) {
  pushOne(name, val, sensitive);
}

console.log("Done. Redeploy production, then: npm run news:cron:sync");

const { Agent, fetch: undiciFetch } = require("undici");

const KEEPALIVE = new Agent({
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 120_000,
  connections: 4,
});

const OWNER_UNPAUSE =
  "Supabase Dashboard (https://supabase.com/dashboard) -> Restore project / Unpause. Paused projects return HTTP 503.";

function getSupabaseHost() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function probeSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const host = getSupabaseHost();
  if (!url || !host) {
    return {
      status: "misconfigured",
      host: host || "",
      message: "NEXT_PUBLIC_SUPABASE_URL missing",
      ownerAction: "Set Supabase URL in .env.local and Vercel Production.",
    };
  }
  const healthUrl = `${url.replace(/\/+$/, "")}/rest/v1/`;
  try {
    const res = await undiciFetch(healthUrl, {
      method: "GET",
      dispatcher: KEEPALIVE,
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 503 || res.status === 502) {
      return {
        status: "paused",
        host,
        httpStatus: res.status,
        message: `HTTP ${res.status} from ${host}`,
        ownerAction: OWNER_UNPAUSE,
      };
    }
    return { status: "ok", host, httpStatus: res.status, message: "reachable" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof Error && err.code ? String(err.code) : "";
    const isDns = /ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(`${msg} ${code}`);
    return {
      status: isDns ? "dns_error" : "network_error",
      host,
      message: msg,
      ownerAction: isDns
        ? `${OWNER_UNPAUSE} Try: nslookup ${host} 8.8.8.8`
        : OWNER_UNPAUSE,
    };
  }
}

function flushDnsCacheBestEffort() {
  if (process.platform !== "win32") return;
  try {
    const { spawnSync } = require("node:child_process");
    spawnSync("ipconfig", ["/flushdns"], { stdio: "ignore", windowsHide: true });
  } catch {
    /* optional */
  }
}

function createSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        undiciFetch(input, { ...init, dispatcher: KEEPALIVE }),
    },
  });
}

module.exports = {
  KEEPALIVE,
  OWNER_UNPAUSE,
  probeSupabase,
  flushDnsCacheBestEffort,
  createSupabaseClient,
  undiciFetch,
};

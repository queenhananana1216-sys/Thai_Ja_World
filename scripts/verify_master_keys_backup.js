/**
 * Physical QA: F:\02_Master_Keys\API_JSON\Thaija_Docker_Env.json 존재·비어 있지 않음 확인.
 * 실패 시 프로젝트 .env/.env.local 로부터 동일 경로에 강제 재기록 (값은 로그에 출력하지 않음).
 */
const fs = require('fs');
const path = require('path');
const {
  OUTPUT_DIR,
  JSON_NAME,
  ENV_NAME,
  mergeEnvFiles,
  writeVaultFromMerged,
} = require('./backup_keys');

const jsonPath = path.join(OUTPUT_DIR, JSON_NAME);
const envDockerPath = path.join(OUTPUT_DIR, ENV_NAME);

/** @returns {{ ok: boolean, keyCount: number, reason?: string }} */
function evaluateJsonFile() {
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, keyCount: 0, reason: 'missing_file' };
  }
  let raw;
  try {
    raw = fs.readFileSync(jsonPath, 'utf8');
  } catch (e) {
    return { ok: false, keyCount: 0, reason: `read_error:${e.code || 'unknown'}` };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, keyCount: 0, reason: 'empty_file' };
  }
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return { ok: false, keyCount: 0, reason: 'invalid_json' };
  }
  let env = obj.env;
  if (!env || typeof env !== 'object') {
    env = obj.values;
  }
  if (!env || typeof env !== 'object') {
    return { ok: false, keyCount: 0, reason: 'no_env_object' };
  }
  const keyCount = Object.keys(env).filter(
    (k) => typeof env[k] === 'string' || typeof env[k] === 'number'
  ).length;
  if (keyCount === 0) {
    return { ok: false, keyCount: 0, reason: 'env_keys_empty' };
  }
  return { ok: true, keyCount };
}

function evaluateEnvDockerSidecar() {
  if (!fs.existsSync(envDockerPath)) {
    return { ok: false, reason: 'missing_env_docker' };
  }
  const st = fs.statSync(envDockerPath);
  if (!st.isFile() || st.size === 0) {
    return { ok: false, reason: 'env_docker_empty' };
  }
  return { ok: true };
}

function repairFromProject(reason) {
  console.error(`[verify] Repair triggered (${reason}). Writing vault from project .env / .env.local…`);
  const merged = mergeEnvFiles();
  const n = Object.keys(merged).length;
  if (n === 0) {
    console.error(
      '[verify] REPAIR FAILED: 프로젝트 루트에 `.env` 또는 `.env.local` 에 병합 가능한 키가 없습니다.'
    );
    process.exit(1);
  }
  const { jsonPath: jp, envPath: ep, keyCount } = writeVaultFromMerged(merged);
  console.log(
    `[verify] Repair OK — wrote ${keyCount} keys to:\n  ${jp}\n  ${ep}`
  );
}

function main() {
  console.log(`[verify] Checking JSON: ${jsonPath}`);

  const j = evaluateJsonFile();
  if (!j.ok) {
    repairFromProject(j.reason || 'json_invalid');
  } else {
    console.log(`[verify] JSON OK — env key count: ${j.keyCount} (values not printed)`);
  }

  const e = evaluateEnvDockerSidecar();
  if (!e.ok) {
    console.error(`[verify] WARNING: ${envDockerPath} — ${e.reason}; repairing from project.`);
    repairFromProject(e.reason || 'env_docker_bad');
  } else {
    console.log(`[verify] .env.docker sidecar OK — exists and non-empty`);
  }

  console.log('[verify] All vault checks passed.');
}

main();

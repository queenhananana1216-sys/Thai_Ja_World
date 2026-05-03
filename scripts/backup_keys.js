/**
 * Merges `.env` + `.env.local` from the project root and writes backups to the owner vault path.
 * Does not print secret values.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join('F:', '02_Master_Keys', 'API_JSON');
const JSON_NAME = 'Thaija_Docker_Env.json';
const ENV_NAME = '.env.docker';

function mergeEnvFiles() {
  const merged = {};
  const sources = ['.env', '.env.local'];

  for (const name of sources) {
    const filePath = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    const parsed = dotenv.parse(buf);
    Object.assign(merged, parsed);
  }

  return merged;
}

function envObjectToDockerFile(env) {
  const lines = [];
  const keys = Object.keys(env).sort();
  for (const key of keys) {
    const raw = env[key] ?? '';
    const escaped = String(raw).replace(/\r?\n/g, '\\n');
    lines.push(`${key}=${escaped}`);
  }
  return `${lines.join('\n')}\n`;
}

/** @param {Record<string, string>} merged */
function writeVaultFromMerged(merged) {
  const keyCount = Object.keys(merged).length;
  if (keyCount === 0) {
    throw new Error('No env keys to write');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jsonPath = path.join(OUTPUT_DIR, JSON_NAME);
  const envPath = path.join(OUTPUT_DIR, ENV_NAME);

  const payload = {
    exportedAt: new Date().toISOString(),
    project: 'taeja-world',
    sourceFiles: ['.env', '.env.local'].filter((n) =>
      fs.existsSync(path.join(PROJECT_ROOT, n))
    ),
    env: merged,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(envPath, envObjectToDockerFile(merged), 'utf8');

  return { jsonPath, envPath, keyCount };
}

function main() {
  const merged = mergeEnvFiles();
  const keyCount = Object.keys(merged).length;

  if (keyCount === 0) {
    console.error(
      '[backup_keys] No variables found. Create `.env` or `.env.local` in the project root first.'
    );
    process.exit(1);
  }

  const { jsonPath, envPath } = writeVaultFromMerged(merged);
  console.log(
    `[backup_keys] Wrote ${keyCount} keys to:\n  ${jsonPath}\n  ${envPath}`
  );
}

module.exports = {
  PROJECT_ROOT,
  OUTPUT_DIR,
  JSON_NAME,
  ENV_NAME,
  mergeEnvFiles,
  writeVaultFromMerged,
  envObjectToDockerFile,
};

if (require.main === module) {
  main();
}

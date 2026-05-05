/**
 * One-off / maintenance: split src/i18n/dictionaries.ts into dictionary-types + locales/*.
 * Run: node scripts/split-i18n-dictionaries.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPath = path.join(root, 'src/i18n/dictionaries.ts');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const iKo = lines.findIndex((l) => /^const ko:\s*Dictionary/.test(l));
const iTh = lines.findIndex((l) => /^const th:\s*Dictionary/.test(l));
const iEn = lines.findIndex((l) => /^const en:\s*Dictionary/.test(l));
const iZh = lines.findIndex((l) => /^const zh:\s*Dictionary/.test(l));

if (iKo < 0 || iTh < 0 || iEn < 0 || iZh < 0) {
  console.error('Could not find locale const boundaries');
  process.exit(1);
}

// export type Dictionary ... through closing `};` (line before const ko)
const typeChunk = lines.slice(5, iKo).join('\n');
const dictTypes = `/**
 * UI 문자열 — shape only. Locale payloads: ./locales/*.ts
 */
${typeChunk}
`;

const localesDir = path.join(root, 'src/i18n/locales');
fs.mkdirSync(localesDir, { recursive: true });
fs.writeFileSync(path.join(root, 'src/i18n/dictionary-types.ts'), dictTypes, 'utf8');

function writeLocale(filename, bodyLines, header) {
  const body = bodyLines.join('\n');
  fs.writeFileSync(path.join(localesDir, filename), `${header}\n${body}\n`, 'utf8');
}

const koBody = lines.slice(iKo, iTh);
koBody[0] = koBody[0].replace(/^const ko:\s*Dictionary\s*=\s*/, 'export const dictionary: Dictionary = ');
writeLocale(
  'ko.ts',
  koBody,
  `import type { Dictionary } from '../dictionary-types';\n`,
);

const thBody = lines.slice(iTh, iEn);
thBody[0] = thBody[0].replace(/^const th:\s*Dictionary\s*=\s*/, 'export const dictionary: Dictionary = ');
writeLocale(
  'th.ts',
  thBody,
  `import type { Dictionary } from '../dictionary-types';\n`,
);

const enBody = lines.slice(iEn, iZh);
enBody[0] = enBody[0].replace(
  /^const en:\s*Dictionary\s*=\s*/,
  'export const dictionary: Dictionary = ',
);
writeLocale(
  'en.ts',
  enBody,
  `import type { Dictionary } from '../dictionary-types';\nimport { dictionary as ko } from './ko';\n`,
);

const zhBody = lines.slice(iZh, iZh + (lines.length - iZh));
// trim everything from `export function getDictionary` onward
const iGet = zhBody.findIndex((l) => /^export function getDictionary/.test(l));
const zhOnly = iGet >= 0 ? zhBody.slice(0, iGet) : zhBody;
// remove trailing empty
while (zhOnly.length && zhOnly[zhOnly.length - 1].trim() === '') zhOnly.pop();
zhOnly[0] = zhOnly[0].replace(/^const zh:\s*Dictionary\s*=\s*/, 'export const dictionary: Dictionary = ');
writeLocale(
  'zh.ts',
  zhOnly,
  `import type { Dictionary } from '../dictionary-types';\nimport { dictionary as ko } from './ko';\n`,
);

console.log('Wrote dictionary-types.ts and locales/ko|th|en|zh.ts');

/**
 * Console Ninja 등이 node_modules/next/.../bundle5.js 앞에 넣는 build-hook 제거.
 * 훅이 남으면 Next/webpack 초기화에서 SyntaxError 등으로 CSS·클라이언트 번들이 죽을 수 있음.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'compiled',
  'webpack',
  'bundle5.js',
);

try {
  if (!fs.existsSync(target)) {
    process.exit(0);
  }

  let s = fs.readFileSync(target, 'utf8');
  const start = '/* build-hook-start */';
  const end = '/* build-hook-end */';
  const i = s.indexOf(start);
  const j = s.indexOf(end);
  if (i < 0 || j <= i) {
    process.exit(0);
  }

  const stripped = s.slice(0, i) + s.slice(j + end.length);
  fs.writeFileSync(target, stripped);
  console.log('[strip-console-ninja-next-hook] Removed build hook from next bundle5.js');
} catch (e) {
  // Vercel/CI 등에서 node_modules 쓰기가 막히면 설치 전체가 실패하지 않도록 함
  console.warn('[strip-console-ninja-next-hook] skipped:', e instanceof Error ? e.message : e);
  process.exit(0);
}

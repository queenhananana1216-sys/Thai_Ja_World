const fs = require('fs');

// Start from original
let css = fs.readFileSync('app/globals.css', 'utf8');

// First, restore from git to get original
require('child_process').execSync('git checkout app/globals.css');
css = fs.readFileSync('app/globals.css', 'utf8');

// Replace hardcoded light colors with variables FIRST (outside of :root)
css = css.replace(/#ffffff/gi, 'var(--tj-surface)');
css = css.replace(/#fff/gi, 'var(--tj-surface)');
css = css.replace(/#fafafa/gi, 'var(--tj-bg)');
css = css.replace(/#f8f8fa/gi, 'var(--tj-ink)');
css = css.replace(/#1a1625/gi, 'var(--tj-ink)');
css = css.replace(/#333/gi, 'var(--tj-ink)');
css = css.replace(/#ccc/gi, 'var(--tj-line)');
css = css.replace(/#e8e8e8/gi, 'var(--tj-line)');
css = css.replace(/#ddd/gi, 'var(--tj-line)');
css = css.replace(/#2d2640/gi, 'var(--tj-ink)');
css = css.replace(/#5c4d7a/gi, 'var(--tj-muted)');
css = css.replace(/#6d5f8f/gi, 'var(--tj-muted)');
css = css.replace(/#151515/gi, 'var(--tj-ink)');
css = css.replace(/#424242/gi, 'var(--tj-muted)');
css = css.replace(/#1a1a22/gi, 'var(--tj-ink)');
css = css.replace(/#202124/gi, 'var(--tj-ink)');
css = css.replace(/#5c5568/gi, 'var(--tj-muted)');
css = css.replace(/#1f2937/gi, 'var(--tj-ink)');
css = css.replace(/#d1d5db/gi, 'var(--tj-line)');
css = css.replace(/#f1f5f9/gi, 'var(--tj-ink)');
css = css.replace(/#fbbf24/gi, 'var(--tj-peach)');
css = css.replace(/#be123c/gi, 'var(--tj-rose)');
css = css.replace(/#e60012/gi, 'var(--tj-rose)');
css = css.replace(/#2563eb/gi, 'var(--tj-link)');

// Fix specific components that need dark backgrounds
css = css.replace(/color:\s*var\(--tj-surface\)/g, 'color: var(--tj-ink)');

// Now replace the :root block
const newRoot = `:root {
  --tj-bg: #09090b;
  --tj-surface: #18181b;
  --tj-ink: #fafafa;
  --tj-muted: #a1a1aa;
  --tj-line: #27272a;
  --tj-rose: #fb7185;
  --tj-peach: #fbbf24;
  --tj-lilac: #a78bfa;
  --tj-lilac-soft: #4c1d95;
  --tj-header: #000000;
  --tj-header-muted: #a1a1aa;
  --tj-link: #60a5fa;
  --tj-link-hover: #93c5fd;
  --tj-shadow: 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3);
  --tj-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3);
  --tj-radius: 12px;
  --tj-radius-sm: 8px;
  --tj-portal-accent: #60a5fa;
  --tj-portal-bg: #1e3a8a;
  --tj-community-accent: #f87171;
  --tj-community-bg: #7f1d1d;
  --tj-success: #34d399;
}`;

css = css.replace(/:root\s*\{[\s\S]*?--tj-success:[^}]+\}/, newRoot);

fs.writeFileSync('app/globals.css', css);
console.log('Updated globals.css');

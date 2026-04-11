const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// Dark text on dark bg → light equivalents
const darkToLight = [
  // Slate/gray family (too dark for dark bg)
  ['#334155', 'var(--tj-ink)'],
  ['#475569', 'var(--tj-muted)'],
  ['#64748b', 'var(--tj-muted)'],
  ['#6b5a3c', 'var(--tj-peach)'],
  ['#5b4d7a', 'var(--tj-lilac)'],
  ['#5c5574', 'var(--tj-muted)'],
  ['#3f6f55', 'var(--tj-success)'],
  ['#8b4a6b', 'var(--tj-rose)'],
  ['#1e293b', 'var(--tj-ink)'],
  ['#111827', 'var(--tj-ink)'],
  ['#1e3a8a', 'var(--tj-link)'],
  ['#15803d', 'var(--tj-success)'],

  // Purple family (too dark)
  ['#4a4458', 'var(--tj-muted)'],
  ['#4c3d62', 'var(--tj-lilac)'],
  ['#6d28d9', 'var(--tj-lilac)'],
  ['#5b21b6', 'var(--tj-lilac)'],
  ['#7c3aed', 'var(--tj-lilac)'],
  ['#6d5a9e', 'var(--tj-muted)'],
  ['#7c6a9e', 'var(--tj-muted)'],
  ['#8b7fb0', 'var(--tj-muted)'],

  // Brown/amber (too dark on dark bg)
  ['#92400e', 'var(--tj-peach)'],
  ['#065f46', 'var(--tj-success)'],
  ['#991b1b', 'var(--tj-rose)'],
  ['#9f1239', 'var(--tj-rose)'],
  ['#be185d', 'var(--tj-rose)'],

  // Muted purple bg that's too dark
  ['#f4effb', 'var(--tj-surface)'],
];

for (const [from, to] of darkToLight) {
  const regex = new RegExp(`color:\\s*${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
  css = css.replace(regex, `color: ${to}`);
}

// Also fix background-color
css = css.replace(/background-color:\s*#f4effb/gi, 'background-color: var(--tj-surface)');

// Fix dotori widget gradient (gold on dark = bad contrast)
css = css.replace(
  /\.fv2-widget--dotori\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#fef3c7[^)]*\)[^}]*\}/g,
  (match) => match.replace(/background:\s*linear-gradient\(135deg,\s*#fef3c7\s*0%,\s*var\(--tj-surface\)\s*60%\)/, 'background: var(--tj-surface)')
);

// Fix hub chip colors
css = css.replace(/\.fv2-hub__chip\s*\{([^}]*?)color:\s*var\(--tj-ink\)/g, '.fv2-hub__chip {$1color: var(--tj-ink)');
css = css.replace(/\.fv2-hub__chip\s*\{([^}]*?)background:\s*var\(--tj-bg\)/g, '.fv2-hub__chip {$1background: var(--tj-surface)');

// Fix fv2-card background: use surface instead of bg for better separation
css = css.replace(/\.fv2-card\s*\{\s*background:\s*var\(--tj-bg\)/g, '.fv2-card { background: var(--tj-surface)');

fs.writeFileSync('app/globals.css', css);

// Count changes
let count = 0;
for (const [from] of darkToLight) {
  if (!css.includes(from)) count++;
}
console.log(`Replaced ${count}/${darkToLight.length} color patterns. Done.`);

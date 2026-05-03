'use client';

import { useMemo, type ReactNode } from 'react';

const KEYWORD_RE = /\b(import|export|from|const|let|var|function|async|await|return|class|interface|type|extends)\b/g;

function highlightLine(line: string, lineKey: number): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(KEYWORD_RE.source, 'g');
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={`${lineKey}-${last}-t`}>{line.slice(last, m.index)}</span>);
    }
    nodes.push(
      <span key={`${lineKey}-${m.index}-k`} className="text-fuchsia-400/95">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  nodes.push(<span key={`${lineKey}-${last}-e`}>{line.slice(last)}</span>);
  return nodes;
}

export default function CodePreview({ code, language }: { code: string; language: string }) {
  const lines = useMemo(() => code.replace(/\r\n/g, '\n').split('\n'), [code]);

  return (
    <div className="sandbox-code-preview rounded-xl border border-white/12 bg-black/55 shadow-inner shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span>미리보기</span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-400">{language}</span>
      </div>
      <pre className="max-h-[min(52vh,560px)] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-slate-100">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 hover:bg-white/[0.03]">
            <span className="w-10 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-all">{highlightLine(line, i)}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

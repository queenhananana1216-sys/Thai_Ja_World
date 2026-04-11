/**
 * 외장 메모리 전용 CLI — 로컬 Ollama와 JSONL 스토어
 * 사용: npm run memory -- <명령> [인자...]
 */

import { getMemoryStorePath } from '@/lib/memory/paths';
import { appendEntry, loadAllEntries } from '@/lib/memory/store';
import { searchMemory } from '@/lib/memory/search';
import { askLocalAi } from '@/lib/ai/localOllama';

function help(): void {
  console.log(`
외장 메모리 (로컬 JSONL + 선택: Ollama)

  npm run memory -- path
  npm run memory -- add <본문...>
  npm run memory -- list [최대개수]
  npm run memory -- search <질의>
  npm run memory -- ask <질문...>     (메모리 검색 후 로컬 AI에 질문)

환경: LOCAL_AI_BASE_URL (기본 http://127.0.0.1:11434/v1), LOCAL_AI_MODEL (기본 llama3.2)
      MEMORY_STORE_PATH 없으면 <auto>/.data/external-memory.jsonl

Ollama: https://ollama.com — 설치 후 터미널에서  ollama pull llama3.2
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === '-h' || cmd === '--help') {
    help();
    process.exit(0);
  }

  if (cmd === 'path') {
    console.log(getMemoryStorePath());
    return;
  }

  if (cmd === 'add') {
    const text = argv.slice(1).join(' ').trim();
    if (!text) {
      console.error('usage: npm run memory -- add <본문>');
      process.exit(1);
    }
    const e = await appendEntry(text);
    console.log('saved', e.id, e.createdAt);
    return;
  }

  if (cmd === 'list') {
    const max = Math.min(100, Math.max(1, parseInt(argv[1] || '20', 10) || 20));
    const all = await loadAllEntries();
    const slice = all.slice(-max).reverse();
    for (const e of slice) {
      const tag = e.tags?.length ? ` [${e.tags.join(', ')}]` : '';
      console.log(`— ${e.id}${tag}\n  ${e.text.slice(0, 200)}${e.text.length > 200 ? '…' : ''}\n`);
    }
    console.log(`(총 ${all.length}건, 최근 ${slice.length}건 표시)`);
    return;
  }

  if (cmd === 'search') {
    const q = argv.slice(1).join(' ').trim();
    if (!q) {
      console.error('usage: npm run memory -- search <질의>');
      process.exit(1);
    }
    const hits = await searchMemory(q, 12);
    if (hits.length === 0) {
      console.log('(없음)');
      return;
    }
    for (const e of hits) {
      console.log(`— ${e.id}\n  ${e.text}\n`);
    }
    return;
  }

  if (cmd === 'ask') {
    const question = argv.slice(1).join(' ').trim();
    if (!question) {
      console.error('usage: npm run memory -- ask <질문>');
      process.exit(1);
    }
    const hits = await searchMemory(question, 6);
    const ctx =
      hits.length > 0
        ? hits.map((e, i) => `[#${i + 1}] ${e.text}`).join('\n')
        : '(저장된 메모리에서 직접 매칭 없음 — 아래 질문만 답변)';

    const system = `너는 사용자의 로컬 메모리 조각을 참고해 답한다. 메모리에 없으면 추측하지 말고 모른다고 말한다. 한국어로 짧게 답한다.`;

    const prompt = `다음은 외장 메모리에서 검색된 조각이다:\n\n${ctx}\n\n---\n질문: ${question}`;

    try {
      const answer = await askLocalAi({ system, prompt });
      console.log(answer);
    } catch (e) {
      console.error(
        '로컬 AI 호출 실패. Ollama 실행 중인지, 모델을 받았는지 확인하세요.',
        e instanceof Error ? e.message : e,
      );
      process.exit(1);
    }
    return;
  }

  console.error('알 수 없는 명령:', cmd);
  help();
  process.exit(1);
}

main();

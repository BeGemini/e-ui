/**
 * Temporary verification: generate a knowledge-points PDF in Node and check the output.
 * Run with: npx tsx scripts/verify-kp-pdf.tsx
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// react-pdf resolves Font src like '/fonts/x.ttf' through fetch; serve them from public/ on disk.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('/')) {
    const file = path.join(process.cwd(), 'public', url);
    const buffer = await readFile(file);
    return new Response(new Uint8Array(buffer), { status: 200 });
  }
  return originalFetch(input, init);
}) as typeof fetch;

async function main() {
  const { build } = await import('../lib/knowledge-point-export/build-pdf');
  const blob = await build({
    title: 'Desperate Housewives S01E01',
    exportedAt: new Date(2026, 10, 1),
    knowledgePoints: [
      {
        knowledgePointId: 'kp-1',
        userId: 'u',
        exerciseId: 'e',
        sourceSentenceIndex: 3,
        capturedText: 'bring about',
        category: 'phrase',
        description:
          '**带来、引起** 的意思，口语里很常用。\n\n- 例句：The change brought about chaos.\n- 近义：`lead to`、`result in`\n\n> 注意后面接名词或动名词。',
        createdDate: '2026-11-01T00:00:00.000Z',
        updatedDate: '2026-11-01T00:00:00.000Z',
      },
      {
        knowledgePointId: 'kp-2',
        userId: 'u',
        exerciseId: 'e',
        sourceSentenceIndex: 7,
        capturedText: 'gorgeous',
        category: 'word',
        description: '非常漂亮的意思。\n\n1. 形容人：She looks gorgeous.\n2. 形容天气：What a gorgeous day!\n\n---\n\n详见 [词典](https://example.com)。',
        createdDate: '2026-11-01T00:00:00.000Z',
        updatedDate: '2026-11-01T00:00:00.000Z',
      },
    ],
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  const out = '/tmp/kp-export-verify.pdf';
  await import('node:fs/promises').then((fs) => fs.writeFile(out, buffer));
  const magic = buffer.subarray(0, 5).toString('latin1');
  console.log('size:', buffer.length, 'magic:', magic);
  if (magic !== '%PDF-' || buffer.length < 1000) {
    throw new Error('PDF output looks wrong');
  }
  console.log('OK ->', out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

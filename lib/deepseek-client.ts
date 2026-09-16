/**
 * DeepSeek API client for AI knowledge point teaching.
 * Uses the OpenAI-compatible chat completions endpoint.
 */

import type {
  AiKnowledgePointTeachRequest,
  DeepSeekResponse,
  KnowledgePointCategory,
} from './types';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MAX_DESCRIPTION_LENGTH = 2000;

function buildSystemPrompt(): string {
  return `你是一位精通跨文化交流、说话带一点情绪和幽默感的资深双语外教。
你的任务是为中国年轻人拆解美剧/听力材料字幕里遇到的英语表达。

【输出格式】
必须只输出一个 Markdown 文档，且只能有以下三个章节：

**释义**

用大白话、地道中文口语解释，带点当代网络感也可以，让人一看就懂。如果是单词，只给最常用、最简单的意思；如果是短语/句子，说明它在当前语境里的含义。控制在 2-3 句话，不要像词典一样罗列。

**使用场景**

给出 1-2 个具体场景（生活、职场、追剧、社交都行），说明什么时候会用这个表达。用 bullet points。

【质量参考示例】
目标词: "chill out"
上下文: "...You need to chill out, it's not that serious..."

**释义**

放轻松、别上头、淡定一点（就是让对方冷静下来，别那么紧张或激动）。

**使用场景**

- 朋友因为一点小事急得跳脚，你可以拍他肩膀说："Dude, chill out."
- 室友赶 ddl 赶得焦虑症发作，你递杯水让他喘口气。

【要求】
- 完全用中文回答。
- 不要问候语、总结、"希望对你有帮助" 这类废话。
- 不要出现两个章节以外的内容。`;
}

function buildUserPrompt(
  capturedText: string,
  category: KnowledgePointCategory,
  sourceSentence: string
): string {
  const categoryLabel =
    category === 'word' ? '单词' : category === 'phrase' ? '短语' : '句子';
  return `用户从字幕中选中的${categoryLabel}："${capturedText}"
原句："${sourceSentence || '未提供'}"

请用中文按上面要求的两个章节（释义、使用场景）解释这个${categoryLabel}。`;
}

function truncateExplanation(explanation: string): string {
  if (explanation.length <= MAX_DESCRIPTION_LENGTH) return explanation;
  return explanation.slice(0, MAX_DESCRIPTION_LENGTH);
}

export interface CallDeepSeekForKnowledgePointResult {
  explanation: string;
}

/**
 * Calls DeepSeek to generate a structured Markdown explanation for a knowledge point.
 */
export async function callDeepSeekForKnowledgePoint(
  request: AiKnowledgePointTeachRequest
): Promise<CallDeepSeekForKnowledgePointResult> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key is not configured');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPrompt(request.capturedText, request.category, request.sourceSentence),
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${body}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    console.error('DeepSeek returned empty content. Raw response:', JSON.stringify(data, null, 2));
    throw new Error('DeepSeek returned an empty explanation');
  }

  return { explanation: truncateExplanation(content) };
}

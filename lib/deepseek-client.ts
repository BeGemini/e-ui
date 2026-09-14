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
  return `You are a helpful English tutor for a Chinese learner using a listening dictation app.
Your task is to explain a captured English word, phrase, or sentence from a TV show subtitle.
You MUST respond ONLY with a Markdown document containing exactly these four sections:

## Meaning
Concise definition or explanation of the captured text.

## Usage Scenarios
Common situations or contexts where this expression is used. Use bullet points.

## Example Sentences
At least 2 example sentences showing natural usage. Prefer examples related to the source sentence when appropriate. Number them.

## Similar / Alternative Expressions
A short list of synonyms, near-equivalents, or related phrases that a learner could also encounter. Use bullet points.

Keep the response concise, learner-friendly, and focused on the captured text. Do not include any greetings, summaries, or extra content outside the four sections.`;
}

function buildUserPrompt(
  capturedText: string,
  category: KnowledgePointCategory,
  sourceSentence: string
): string {
  const categoryLabel = category === 'word' ? 'word' : category === 'phrase' ? 'phrase' : 'sentence';
  return `Captured ${categoryLabel}: "${capturedText}"
Source sentence: "${sourceSentence || 'Not provided'}"

Please explain this ${categoryLabel} using the required four sections.`;
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
    throw new Error('DeepSeek returned an empty explanation');
  }

  return { explanation: truncateExplanation(content) };
}

import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Sentence records (feature 008)
 *
 * - save-attempt / save-progress upsert: one record per sentence, last save wins
 * - save-attempt does not advance progress
 * - GET sentences: ascending order, per-user isolation
 *
 * Runs against a live server at TEST_BASE_URL (default http://localhost:3000),
 * which must be connected to a local/dev database with migration 005 applied.
 */

const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const MISSING_EXERCISE_ID = '00000000-0000-4000-8000-000000000000';

interface SentenceRecord {
  sentenceIndex: number;
  userInput: string;
  correctAnswer: string;
  savedAt: string;
}

interface AttemptRecord {
  sentenceIndex: number;
  userInput: string;
}

async function registerAndLogin(label: string, invitationCode: string): Promise<string> {
  const email = `sentence-${label}-${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  const registerRes = await fetch(`${testBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, invitationCode }),
  });
  const registerData = await registerRes.json();
  if (registerData.token) return registerData.token as string;

  const loginRes = await fetch(`${testBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  return loginData.token as string;
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function saveAttempt(
  token: string,
  exerciseId: string,
  body: Record<string, unknown>
): Promise<Response> {
  return fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-attempt`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

function validAttempt(sentenceIndex: number, userInput: string): Record<string, unknown> {
  return {
    sentenceIndex,
    userInput,
    correctText: 'Hello words.',
    accuracy: 80,
    wordFeedback: [],
  };
}

async function getSentences(token: string, exerciseId: string): Promise<Response> {
  return fetch(`${testBaseUrl}/api/practice/${exerciseId}/sentences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('Sentence records integration tests', () => {
  let tokenA: string;
  let tokenB: string;
  let exerciseId: string;

  beforeAll(async () => {
    tokenA = await registerAndLogin('a', process.env.TEST_INVITATION_CODE_A || 'SENTENCECODE1');
    tokenB = await registerAndLogin('b', process.env.TEST_INVITATION_CODE_B || 'SENTENCECODE2');

    const listRes = await fetch(`${testBaseUrl}/api/exercises`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listData = await listRes.json();
    const series = listData.series[0];
    exerciseId = series.seasons[0].episodes[0].exercises[0].exerciseId;
  });

  describe('save-attempt & save-progress upsert', () => {
    it('(a) keeps exactly one record per sentence; the last save wins', async () => {
      expect((await saveAttempt(tokenA, exerciseId, validAttempt(1, 'hello world'))).status).toBe(200);
      expect((await saveAttempt(tokenA, exerciseId, validAttempt(1, 'hello word'))).status).toBe(200);

      const progressRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: authHeaders(tokenA),
        body: JSON.stringify({
          sentenceIndex: 1,
          userInput: 'hello words',
          correctText: 'Hello words.',
          accuracy: 90,
          wordFeedback: [],
        }),
      });
      expect(progressRes.status).toBe(201);
      const progressData = await progressRes.json();
      expect(progressData.error).toBeUndefined();

      const res = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      const forSentence = (data.attempts as AttemptRecord[]).filter((a) => a.sentenceIndex === 1);
      expect(forSentence).toHaveLength(1);
      expect(forSentence[0].userInput).toBe('hello words');
    });

    it('(b) save-attempt does not advance progress', async () => {
      const before = await (
        await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        })
      ).json();

      const res = await saveAttempt(tokenA, exerciseId, validAttempt(5, 'ahead of progress'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sentenceIndex).toBe(5);
      expect(typeof body.savedAt).toBe('string');

      const after = await (
        await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        })
      ).json();
      expect(after.progress.currentSentenceIndex).toBe(before.progress.currentSentenceIndex);
      expect(Boolean(after.progress.isCompleted)).toBe(Boolean(before.progress.isCompleted));
    });

    it('(c) rejects invalid bodies with 400', async () => {
      const invalidBodies: Record<string, unknown>[] = [
        { ...validAttempt(1, 'x'), userInput: '   ' },
        { ...validAttempt(1, 'x'), sentenceIndex: -1 },
        { ...validAttempt(1, 'x'), sentenceIndex: 1.5 },
        { ...validAttempt(1, 'x'), accuracy: 101 },
        { ...validAttempt(1, 'x'), correctText: '' },
        { ...validAttempt(1, 'x'), wordFeedback: 'x' },
      ];
      for (const body of invalidBodies) {
        const res = await saveAttempt(tokenA, exerciseId, body);
        expect(res.status).toBe(400);
      }
    });

    it('(d) returns 404 for an unknown exercise and 401 without a token', async () => {
      const notFound = await saveAttempt(tokenA, MISSING_EXERCISE_ID, validAttempt(0, 'hi'));
      expect(notFound.status).toBe(404);

      const unauthorized = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAttempt(0, 'hi')),
      });
      expect(unauthorized.status).toBe(401);
    });
  });

  describe('GET sentences', () => {
    it('(e) returns records in strictly ascending sentenceIndex order', async () => {
      for (const index of [4, 0, 2]) {
        expect((await saveAttempt(tokenA, exerciseId, validAttempt(index, `answer ${index}`))).status).toBe(200);
      }

      const res = await getSentences(tokenA, exerciseId);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.exercise.title).toBe('string');
      expect(data.exercise.title.length).toBeGreaterThan(0);

      const sentences = data.sentences as SentenceRecord[];
      for (let i = 1; i < sentences.length; i++) {
        expect(sentences[i].sentenceIndex).toBeGreaterThan(sentences[i - 1].sentenceIndex);
      }
      for (const index of [0, 2, 4]) {
        expect(sentences.some((s) => s.sentenceIndex === index)).toBe(true);
      }
      for (const sentence of sentences) {
        expect(typeof sentence.correctAnswer).toBe('string');
        expect(Number.isNaN(Date.parse(sentence.savedAt))).toBe(false);
      }
    });

    it('(f) isolates records per user', async () => {
      const res = await getSentences(tokenB, exerciseId);
      expect(res.status).toBe(200);
      const data = await res.json();
      const inputs = (data.sentences as SentenceRecord[]).map((s) => s.userInput);
      expect(inputs).not.toContain('hello words');
      expect(inputs).not.toContain('answer 4');
      expect(inputs).not.toContain('ahead of progress');
    });

    it('(g) returns 404 for an unknown exercise and 401 without a token', async () => {
      const notFound = await getSentences(tokenA, MISSING_EXERCISE_ID);
      expect(notFound.status).toBe(404);
      expect(await notFound.json()).toEqual({ error: 'Exercise not found' });

      const unauthorized = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/sentences`);
      expect(unauthorized.status).toBe(401);
    });
  });
});

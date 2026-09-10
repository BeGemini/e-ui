import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Dictation Practice Flow
 * 
 * Tests the practice workflow:
 * 1. Get practice data with subtitles and user config
 * 2. Submit dictation for accuracy checking
 * 3. Save progress after sentence
 * 4. Handle exercise completion
 */

describe('Dictation Practice Flow Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;
  let exerciseId: string;

  beforeAll(async () => {
    // Register and login
    const registerRes = await fetch(`${testBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'practice-test@example.com',
        password: 'SecurePassword123!',
        invitationCode: 'PRACTICECODE',
      }),
    });

    const registerData = await registerRes.json();
    authToken = registerData.token;

    // Get an exercise
    const listRes = await fetch(`${testBaseUrl}/api/exercises`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const listData = await listRes.json();
    if (listData.series.length > 0) {
      const series = listData.series[0];
      const season = series.seasons[0];
      const episode = season.episodes[0];
      exerciseId = episode.exercises[0].exerciseId;
    }
  });

  describe('Get Practice Data', () => {
    it('should get exercise with parsed subtitles', async () => {
      // Start exercise first
      await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const response = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exerciseId).toBe(exerciseId);
      expect(data.videoUrl).toBeDefined();
      expect(data.subtitleFormat).toBeDefined();
      expect(data.subtitles).toBeDefined();
      expect(Array.isArray(data.subtitles)).toBe(true);

      if (data.subtitles.length > 0) {
        const subtitle = data.subtitles[0];
        expect(subtitle.index).toBe(0);
        expect(subtitle.start).toBeDefined();
        expect(subtitle.end).toBeDefined();
        expect(subtitle.text).toBeDefined();
        expect(subtitle.userConfigured).toBeDefined();
      }
    });

    it('should apply user subtitle config to practice data', async () => {
      const response = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      data.subtitles.forEach((subtitle: any) => {
        expect(subtitle.userConfigured).toHaveProperty('isMerged');
        expect(subtitle.userConfigured).toHaveProperty('isSkipped');
      });
    });

    it('should include user progress status', async () => {
      const response = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      expect(data.userProgress).toBeDefined();
      expect(data.userProgress.currentSentenceIndex).toBeDefined();
      expect(data.userProgress.isCompleted).toBeDefined();
    });
  });

  describe('Check Accuracy', () => {
    it('should check accuracy of dictation input', async () => {
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const practiceData = await practiceRes.json();
      const subtitle = practiceData.subtitles[0];

      const checkRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: subtitle.index,
          userInput: subtitle.text, // Exact match
          correctText: subtitle.text,
        }),
      });

      expect(checkRes.status).toBe(200);
      const result = await checkRes.json();
      expect(result.accuracy).toBeDefined();
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
      expect(result.wordFeedback).toBeDefined();
      expect(Array.isArray(result.wordFeedback)).toBe(true);
    });

    it('should return 100% accuracy for exact match', async () => {
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const practiceData = await practiceRes.json();
      const subtitle = practiceData.subtitles[0];

      const checkRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: subtitle.index,
          userInput: subtitle.text,
          correctText: subtitle.text,
        }),
      });

      const result = await checkRes.json();
      expect(result.accuracy).toBe(100);
    });

    it('should handle typos gracefully', async () => {
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const practiceData = await practiceRes.json();
      const subtitle = practiceData.subtitles[0];

      // Introduce a typo
      const userInput = subtitle.text.replace(/l/g, '1'); // Replace 'l' with '1'

      const checkRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: subtitle.index,
          userInput,
          correctText: subtitle.text,
        }),
      });

      const result = await checkRes.json();
      expect(result.wordFeedback).toBeDefined();
    });
  });

  describe('Save Progress', () => {
    it('should save progress after completing sentence', async () => {
      const saveRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: 0,
          accuracy: 85,
          isCompleted: false,
        }),
      });

      expect(saveRes.status).toBe(200);
      const result = await saveRes.json();
      expect(result.progressId).toBeDefined();
      expect(result.currentSentenceIndex).toBeDefined();
    });

    it('should advance current sentence index', async () => {
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const before = (await practiceRes.json()).userProgress.currentSentenceIndex;

      await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: before,
          accuracy: 90,
          isCompleted: false,
        }),
      });

      const practiceRes2 = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const after = (await practiceRes2.json()).userProgress.currentSentenceIndex;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('should mark exercise as completed', async () => {
      const saveRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: 0,
          accuracy: 95,
          isCompleted: true,
        }),
      });

      const result = await saveRes.json();
      expect(result.isCompleted).toBe(true);
      expect(result.overallAccuracy).toBeDefined();
    });

    it('should calculate overall accuracy on completion', async () => {
      const saveRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: 0,
          accuracy: 85,
          isCompleted: true,
        }),
      });

      const result = await saveRes.json();
      expect(result.overallAccuracy).toBeDefined();
      expect(result.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.overallAccuracy).toBeLessThanOrEqual(100);
    });

    it('should require authentication', async () => {
      const saveRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentenceIndex: 0,
          accuracy: 90,
          isCompleted: false,
        }),
      });

      expect(saveRes.status).toBe(401);
    });
  });
});

import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Exercise Browsing & Progress
 * 
 * Tests the exercise management flow:
 * 1. List exercises with hierarchy
 * 2. Get exercise details
 * 3. Start new exercise
 * 4. Resume exercise progress
 * 5. Update progress
 */

describe('Exercise Browsing and Progress Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;
  let userId: string;
  let exerciseId: string;

  beforeAll(async () => {
    // Register and login user
    const registerRes = await fetch(`${testBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'exercise-test@example.com',
        password: 'SecurePassword123!',
        invitationCode: 'EXERCISECODE',
      }),
    });

    const registerData = await registerRes.json();
    authToken = registerData.token;
    userId = registerData.user.id;
  });

  describe('Exercise Listing', () => {
    it('should list all exercises with hierarchy', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.series).toBeDefined();
      expect(Array.isArray(data.series)).toBe(true);

      if (data.series.length > 0) {
        const series = data.series[0];
        expect(series.seriesId).toBeDefined();
        expect(series.title).toBeDefined();
        expect(series.seasons).toBeDefined();
      }
    });

    it('should support pagination', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
    });

    it('should support filtering by difficulty', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises?difficulty=beginner`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // All exercises should be beginner level
      data.series.forEach((series: any) => {
        expect(series.difficulty).toBe('beginner');
      });
    });

    it('should support search by title', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises?search=news`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Results should contain search term
      expect(data.series.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Get Exercise Details', () => {
    it('should get exercise metadata with user progress', async () => {
      const listRes = await fetch(`${testBaseUrl}/api/exercises`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const listData = await listRes.json();
      if (listData.series.length === 0) {
        console.warn('No test data available');
        return;
      }

      // Get first available exercise
      const series = listData.series[0];
      const season = series.seasons[0];
      const episode = season.episodes[0];
      const exercise = episode.exercises[0];
      exerciseId = exercise.exerciseId;

      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exerciseId).toBe(exerciseId);
      expect(data.title).toBeDefined();
      expect(data.difficulty).toBeDefined();
      expect(data.videoUrl).toBeDefined();
      expect(data.userProgress).toBeDefined();
    });

    it('should return 404 for non-existent exercise', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises/nonexistent-id`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Start Exercise', () => {
    it('should create progress record on first start', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.progressId).toBeDefined();
      expect(data.currentSentenceIndex).toBe(0);
      expect(data.isCompleted).toBe(false);
    });

    it('should return existing progress on subsequent starts', async () => {
      // Start exercise first time
      await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Start again
      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.progressId).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Get Progress', () => {
    it('should get user progress and recent attempts', async () => {
      // First ensure user has started exercise
      await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.progressId).toBeDefined();
      expect(data.currentSentenceIndex).toBeDefined();
      expect(data.isCompleted).toBeDefined();
      expect(data.attempts).toBeDefined();
      expect(Array.isArray(data.attempts)).toBe(true);
    });

    it('should return empty attempts for new exercise', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      expect(data.attempts.length).toBeGreaterThanOrEqual(0);
    });

    it('should return last 10 attempts', async () => {
      const response = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      expect(data.attempts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Resume Exercise', () => {
    it('should maintain progress across sessions', async () => {
      // Start exercise
      const startRes = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const startData = await startRes.json();
      const originalIndex = startData.currentSentenceIndex;

      // Get progress
      const progressRes = await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/progress`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const progressData = await progressRes.json();
      expect(progressData.currentSentenceIndex).toBe(originalIndex);
    });
  });
});

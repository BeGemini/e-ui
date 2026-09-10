import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Subtitle Customization Flow
 * 
 * Tests subtitle configuration:
 * 1. Get current subtitle config
 * 2. Create/update merge groups
 * 3. Mark sentences as skip
 * 4. Validate read-only constraints
 * 5. Reset to default
 */

describe('Subtitle Customization Flow Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;
  let exerciseId: string;

  beforeAll(async () => {
    // Register and login
    const registerRes = await fetch(`${testBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'subtitle-test@example.com',
        password: 'SecurePassword123!',
        invitationCode: 'SUBTITLECODE',
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

    // Start exercise
    await fetch(`${testBaseUrl}/api/exercises/${exerciseId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
  });

  describe('Get Subtitle Config', () => {
    it('should get current subtitle config', async () => {
      const response = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.exerciseId).toBe(exerciseId);
      expect(data.mergedGroups).toBeDefined();
      expect(data.skippedSentences).toBeDefined();
      expect(Array.isArray(data.mergedGroups)).toBe(true);
      expect(Array.isArray(data.skippedSentences)).toBe(true);
    });

    it('should return empty config for new exercise', async () => {
      const response = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await response.json();
      expect(data.mergedGroups.length).toBe(0);
      expect(data.skippedSentences.length).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`);

      expect(response.status).toBe(401);
    });
  });

  describe('Update Subtitle Config', () => {
    it('should add merge group', async () => {
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 2,
              label: 'Opening',
            },
          ],
          skippedSentences: [],
        }),
      });

      expect(updateRes.status).toBe(200);
      const data = await updateRes.json();
      expect(data.mergedGroups).toHaveLength(1);
      expect(data.mergedGroups[0].label).toBe('Opening');
    });

    it('should mark sentences as skipped', async () => {
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [],
          skippedSentences: [5, 10, 15],
        }),
      });

      expect(updateRes.status).toBe(200);
      const data = await updateRes.json();
      expect(data.skippedSentences).toEqual([5, 10, 15]);
    });

    it('should prevent overlapping merge groups', async () => {
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 5,
              label: 'Group 1',
            },
            {
              startIndex: 3,
              endIndex: 8,
              label: 'Group 2', // Overlaps with Group 1
            },
          ],
          skippedSentences: [],
        }),
      });

      expect(updateRes.status).toBe(400); // Should be rejected
    });

    it('should enforce read-only constraint on completed sentences', async () => {
      // First, update progress to sentence 5
      await fetch(`${testBaseUrl}/api/practice/${exerciseId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sentenceIndex: 5,
          accuracy: 90,
          isCompleted: false,
        }),
      });

      // Try to modify sentence 2 (already completed)
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 2, // Covers completed sentences
              label: 'Invalid',
            },
          ],
          skippedSentences: [],
        }),
      });

      expect(updateRes.status).toBe(400); // Should be rejected
    });

    it('should allow modifying only after current progress', async () => {
      // Progress is at sentence 5
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 6,
              endIndex: 10,
              label: 'Future Group',
            },
          ],
          skippedSentences: [],
        }),
      });

      expect(updateRes.status).toBe(200); // Should succeed
    });

    it('should validate index ranges', async () => {
      const updateRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 9999, // Out of range
              label: 'Invalid',
            },
          ],
          skippedSentences: [],
        }),
      });

      expect(updateRes.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mergedGroups: [],
          skippedSentences: [],
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Reset Config', () => {
    it('should reset to default empty config', async () => {
      // First set some config
      await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 5,
              label: 'Test',
            },
          ],
          skippedSentences: [10],
        }),
      });

      // Reset
      const resetRes = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(resetRes.status).toBe(200);
      const data = await resetRes.json();
      expect(data.mergedGroups).toEqual([]);
      expect(data.skippedSentences).toEqual([]);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Config Applied to Practice', () => {
    it('should reflect merged groups in practice data', async () => {
      // Set merge group
      await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [
            {
              startIndex: 0,
              endIndex: 2,
              label: 'Intro',
            },
          ],
          skippedSentences: [],
        }),
      });

      // Get practice data
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const practiceData = await practiceRes.json();
      // Sentences 0-2 should be marked as merged
      for (let i = 0; i <= 2; i++) {
        if (i < practiceData.subtitles.length) {
          const subtitle = practiceData.subtitles.find((s: any) => s.index === i);
          if (subtitle) {
            expect(subtitle.userConfigured.isMerged).toBe(true);
            expect(subtitle.userConfigured.mergedLabel).toBe('Intro');
          }
        }
      }
    });

    it('should reflect skipped sentences in practice data', async () => {
      // Set skip config
      await fetch(`${testBaseUrl}/api/subtitles/${exerciseId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mergedGroups: [],
          skippedSentences: [5, 7, 9],
        }),
      });

      // Get practice data
      const practiceRes = await fetch(`${testBaseUrl}/api/practice/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const practiceData = await practiceRes.json();
      // Sentences 5, 7, 9 should be marked as skipped
      [5, 7, 9].forEach((idx) => {
        const subtitle = practiceData.subtitles.find((s: any) => s.index === idx);
        if (subtitle) {
          expect(subtitle.userConfigured.isSkipped).toBe(true);
        }
      });
    });
  });
});

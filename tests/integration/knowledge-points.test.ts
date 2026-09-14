/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Exercise Knowledge Points API
 *
 * Tests the knowledge point lifecycle:
 * 1. Create a knowledge point from feedback text
 * 2. List knowledge points for an exercise
 * 3. Update a knowledge point
 * 4. Delete a knowledge point
 * 5. Ignore duplicate creates for the same captured text
 */

describe('Knowledge Points API Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;
  let exerciseId: string;
  let knowledgePointId: string;

  beforeAll(async () => {
    const loginRes = await fetch(`${testBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'Student123!',
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Failed to login test user: ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json();
    authToken = loginData.token;

    const listRes = await fetch(`${testBaseUrl}/api/exercises`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const listData = await listRes.json();
    if (!listData.data || listData.data.length === 0) {
      throw new Error('No test exercises available');
    }

    const firstExercise = listData.data[0].seasons[0].episodes[0].exercises[0];
    exerciseId = firstExercise.exerciseId;
  });

  describe('Create Knowledge Point', () => {
    it('should create a new knowledge point', async () => {
      const response = await fetch(`${testBaseUrl}/api/knowledge-points/${exerciseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceSentenceIndex: 0,
          capturedText: 'hello',
          category: 'word',
          description: 'A common greeting',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.capturedText).toBe('hello');
      expect(data.data.category).toBe('word');
      knowledgePointId = data.data.knowledgePointId;
    });

    it('should ignore duplicate knowledge points and return the existing one', async () => {
      const response = await fetch(`${testBaseUrl}/api/knowledge-points/${exerciseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceSentenceIndex: 0,
          capturedText: 'hello',
          category: 'word',
          description: 'Duplicate should be ignored',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.knowledgePointId).toBe(knowledgePointId);
    });

    it('should reject invalid category', async () => {
      const response = await fetch(`${testBaseUrl}/api/knowledge-points/${exerciseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceSentenceIndex: 0,
          capturedText: 'test',
          category: 'invalid',
          description: 'Should fail',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('List Knowledge Points', () => {
    it('should list knowledge points for the exercise', async () => {
      const response = await fetch(`${testBaseUrl}/api/knowledge-points/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await fetch(`${testBaseUrl}/api/knowledge-points/${exerciseId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('Update Knowledge Point', () => {
    it('should update category and description', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/knowledge-points/${exerciseId}/${knowledgePointId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            category: 'phrase',
            description: 'Updated note',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('phrase');
      expect(data.data.description).toBe('Updated note');
    });

    it('should reject empty update body', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/knowledge-points/${exerciseId}/${knowledgePointId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Delete Knowledge Point', () => {
    it('should delete the knowledge point', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/knowledge-points/${exerciseId}/${knowledgePointId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 for already deleted knowledge point', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/knowledge-points/${exerciseId}/${knowledgePointId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(404);
    });
  });
});

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration Tests: Exercise Notes API
 *
 * Tests the note lifecycle:
 * 1. Create a note from feedback text
 * 2. List notes for an exercise
 * 3. Update a note
 * 4. Delete a note
 * 5. Ignore duplicate creates for the same captured text
 */

describe('Notes API Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let authToken: string;
  let exerciseId: string;
  let noteId: string;

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

  describe('Create Note', () => {
    it('should create a new note', async () => {
      const response = await fetch(`${testBaseUrl}/api/notes/${exerciseId}`, {
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
      noteId = data.data.noteId;
    });

    it('should ignore duplicate notes and return the existing one', async () => {
      const response = await fetch(`${testBaseUrl}/api/notes/${exerciseId}`, {
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
      expect(data.data.noteId).toBe(noteId);
    });

    it('should reject invalid category', async () => {
      const response = await fetch(`${testBaseUrl}/api/notes/${exerciseId}`, {
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

  describe('List Notes', () => {
    it('should list notes for the exercise', async () => {
      const response = await fetch(`${testBaseUrl}/api/notes/${exerciseId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await fetch(`${testBaseUrl}/api/notes/${exerciseId}`);
      expect(response.status).toBe(401);
    });
  });

  describe('Update Note', () => {
    it('should update category and description', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/notes/${exerciseId}/${noteId}`,
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
        `${testBaseUrl}/api/notes/${exerciseId}/${noteId}`,
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

  describe('Delete Note', () => {
    it('should delete the note', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/notes/${exerciseId}/${noteId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 for already deleted note', async () => {
      const response = await fetch(
        `${testBaseUrl}/api/notes/${exerciseId}/${noteId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.status).toBe(404);
    });
  });
});

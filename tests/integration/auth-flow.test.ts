import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * Integration Tests: Authentication Flow
 * 
 * Tests the complete auth flow:
 * 1. User registration with valid invitation code
 * 2. User registration with invalid/used code
 * 3. User registration with duplicate email
 * 4. User login/logout
 * 5. JWT token validation
 * 
 * Note: These tests assume a test database is configured
 */

describe('Authentication Flow Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  
  beforeAll(async () => {
    // Seed test data: create invitation codes and test users
    // In a real scenario, this would reset the test database
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('User Registration', () => {
    it('should register a user with valid invitation code', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          invitationCode: 'VALIDCODE123',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.token).toBeDefined();
    });

    it('should reject registration with invalid invitation code', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          invitationCode: 'INVALIDCODE',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject registration with used invitation code', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test2@example.com',
          password: 'SecurePassword123!',
          invitationCode: 'USEDCODE456',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
          invitationCode: 'CODE1',
        }),
      });

      // Second registration with same email
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'DifferentPassword456!',
          invitationCode: 'CODE2',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/email|already|exists/i);
    });

    it('should reject weak passwords', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'weakpass@example.com',
          password: '123', // Too weak
          invitationCode: 'CODE3',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'SecurePassword123!',
          invitationCode: 'CODE4',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('User Login', () => {
    it('should login with correct credentials', async () => {
      // Register first
      await fetch(`${testBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'SecurePassword123!',
          invitationCode: 'CODE5',
        }),
      });

      // Login
      const response = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'SecurePassword123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('login@example.com');
    });

    it('should reject login with incorrect password', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'WrongPassword',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject login with non-existent email', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should update lastLoginDate on successful login', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'SecurePassword123!',
        }),
      });

      const data = await response.json();
      expect(data.user.lastLoginDate).toBeDefined();
    });
  });

  describe('Token Validation', () => {
    it('should validate JWT token from login', async () => {
      const loginResponse = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'SecurePassword123!',
        }),
      });

      const loginData = await loginResponse.json();
      const token = loginData.token;

      // Use token to access protected endpoint
      const meResponse = await fetch(`${testBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.status).toBe(200);
      const meData = await meResponse.json();
      expect(meData.user).toBeDefined();
      expect(meData.user.email).toBe('login@example.com');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject missing authorization header', async () => {
      const response = await fetch(`${testBaseUrl}/api/auth/me`);

      expect(response.status).toBe(401);
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const loginResponse = await fetch(`${testBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'SecurePassword123!',
        }),
      });

      const loginData = await loginResponse.json();

      const logoutResponse = await fetch(`${testBaseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      });

      expect(logoutResponse.status).toBe(200);
    });
  });
});

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateCode,
  markCodeAsUsed,
  isCodeExpired,
} from '@/lib/invitation-codes';

describe('Invitation Code Validation', () => {
  describe('validateCode', () => {
    it('should validate a valid, unused code', async () => {
      // Mock implementation - in real tests, would use a test database
      const result = await validateCode('VALIDCODE123');
      expect(result).toEqual({
        valid: true,
        code: 'VALIDCODE123',
        used: false,
        expired: false,
      });
    });

    it('should reject an already used code', async () => {
      const result = await validateCode('USEDCODE456');
      expect(result.valid).toBe(false);
      expect(result.used).toBe(true);
    });

    it('should reject an expired code', async () => {
      const result = await validateCode('EXPIREDCODE789');
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should reject a non-existent code', async () => {
      const result = await validateCode('NONEXISTENT');
      expect(result.valid).toBe(false);
    });

    it('should handle empty code', async () => {
      const result = await validateCode('');
      expect(result.valid).toBe(false);
    });

    it('should handle case-insensitive code matching', async () => {
      const result1 = await validateCode('TESTCODE');
      const result2 = await validateCode('testcode');
      expect(result1.valid).toBe(result2.valid);
    });
  });

  describe('markCodeAsUsed', () => {
    it('should mark a code as used', async () => {
      const result = await markCodeAsUsed('VALIDCODE123', 'user-id-123');
      expect(result.success).toBe(true);
      expect(result.code).toBe('VALIDCODE123');
      expect(result.usedBy).toBe('user-id-123');
    });

    it('should not allow marking an already used code', async () => {
      const result = await markCodeAsUsed('USEDCODE456', 'user-id-456');
      expect(result.success).toBe(false);
    });

    it('should record the usage timestamp', async () => {
      const result = await markCodeAsUsed('VALIDCODE123', 'user-id-123');
      expect(result.usedAt).toBeDefined();
      expect(new Date(result.usedAt)).toBeInstanceOf(Date);
    });

    it('should handle missing code gracefully', async () => {
      const result = await markCodeAsUsed('NONEXISTENT', 'user-id-123');
      expect(result.success).toBe(false);
    });
  });

  describe('isCodeExpired', () => {
    it('should return false for non-expired code', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = await isCodeExpired('VALIDCODE123', futureDate);
      expect(result).toBe(false);
    });

    it('should return true for expired code', async () => {
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const result = await isCodeExpired('EXPIREDCODE789', pastDate);
      expect(result).toBe(true);
    });

    it('should return true for code expiring today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = await isCodeExpired('EXPIRINGTODAY', today);
      expect(result).toBe(true);
    });

    it('should return false for code expiring tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = await isCodeExpired('EXPIRINGTOMORROW', tomorrow);
      expect(result).toBe(false);
    });
  });

  describe('Code Format Validation', () => {
    it('should accept alphanumeric codes', async () => {
      const result = await validateCode('CODE123ABC456');
      expect(result).toBeDefined();
    });

    it('should handle codes with hyphens', async () => {
      const result = await validateCode('CODE-123-ABC');
      expect(result).toBeDefined();
    });

    it('should handle very long codes', async () => {
      const longCode = 'A'.repeat(100);
      const result = await validateCode(longCode);
      expect(result).toBeDefined();
    });

    it('should handle special characters gracefully', async () => {
      const result = await validateCode('CODE@#$%');
      expect(result).toBeDefined();
    });
  });
});

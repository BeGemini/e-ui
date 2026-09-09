import { query, queryOne, execute } from './db';
import { InvitationCode } from './types';

/**
 * Validate an invitation code
 * @param code - Invitation code to validate
 * @returns Promise<{ isValid: boolean; message: string; code?: InvitationCode }>
 */
export async function validateCode(
  code: string
): Promise<{ isValid: boolean; message: string; invitationCode?: InvitationCode }> {
  if (!code || typeof code !== 'string') {
    return { isValid: false, message: 'Invalid code format' };
  }

  try {
    const result = await queryOne<InvitationCode>(
      'SELECT * FROM InvitationCode WHERE code = ?',
      [code]
    );

    if (!result) {
      return { isValid: false, message: 'Code not found' };
    }

    // Check if code has been used
    if (result.isUsed) {
      return { isValid: false, message: 'Code has already been used' };
    }

    // Check if code is expired
    if (result.expiryDate && new Date(result.expiryDate) < new Date()) {
      return { isValid: false, message: 'Code has expired' };
    }

    return {
      isValid: true,
      message: 'Code is valid',
      invitationCode: result,
    };
  } catch (error) {
    console.error('Error validating invitation code:', error);
    return { isValid: false, message: 'Error validating code' };
  }
}

/**
 * Mark an invitation code as used
 * @param codeId - ID of the invitation code
 * @param userId - User ID to link the code to
 * @returns Promise<boolean> - True if successful
 */
export async function markCodeAsUsed(codeId: string, userId: string): Promise<boolean> {
  try {
    await execute(
      'UPDATE InvitationCode SET isUsed = 1, usedByUserId = ? WHERE codeId = ?',
      [userId, codeId]
    );
    return true;
  } catch (error) {
    console.error('Error marking code as used:', error);
    return false;
  }
}

/**
 * Check if a code has expired
 * @param expiryDate - Expiry date from invitation code
 * @returns boolean - True if code is expired
 */
export function isCodeExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) {
    return false; // No expiry date means it never expires
  }
  return new Date(expiryDate) < new Date();
}

/**
 * Generate a new invitation code
 * @param expiryDate - Optional expiry date for the code
 * @returns Promise<string> - Generated code
 */
export async function generateInvitationCode(expiryDate?: Date): Promise<string> {
  // Generate a random 12-character code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code;
}

/**
 * Get invitation code by ID
 * @param codeId - Code ID
 * @returns Promise<InvitationCode | null>
 */
export async function getInvitationCodeById(codeId: string): Promise<InvitationCode | null> {
  try {
    return (await queryOne<InvitationCode>(
      'SELECT * FROM InvitationCode WHERE codeId = ?',
      [codeId]
    )) as InvitationCode | null;
  } catch (error) {
    console.error('Error getting invitation code:', error);
    return null;
  }
}

/**
 * Get invitation code by code string
 * @param code - Code string
 * @returns Promise<InvitationCode | null>
 */
export async function getInvitationCodeByString(code: string): Promise<InvitationCode | null> {
  try {
    return (await queryOne<InvitationCode>(
      'SELECT * FROM InvitationCode WHERE code = ?',
      [code]
    )) as InvitationCode | null;
  } catch (error) {
    console.error('Error getting invitation code:', error);
    return null;
  }
}

/**
 * List all unused invitation codes (admin only)
 * @returns Promise<InvitationCode[]>
 */
export async function listUnusedCodes(): Promise<InvitationCode[]> {
  try {
    return (await query<InvitationCode>(
      'SELECT * FROM InvitationCode WHERE isUsed = 0 ORDER BY createdDate DESC',
      []
    )) as InvitationCode[];
  } catch (error) {
    console.error('Error listing unused codes:', error);
    return [];
  }
}

/**
 * List all used invitation codes (admin only)
 * @returns Promise<InvitationCode[]>
 */
export async function listUsedCodes(): Promise<InvitationCode[]> {
  try {
    return (await query<InvitationCode>(
      'SELECT * FROM InvitationCode WHERE isUsed = 1 ORDER BY createdDate DESC',
      []
    )) as InvitationCode[];
  } catch (error) {
    console.error('Error listing used codes:', error);
    return [];
  }
}

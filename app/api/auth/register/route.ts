import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, validatePasswordStrength, validateEmail } from '@/lib/auth';
import { validateCode, markCodeAsUsed, getInvitationCodeByString } from '@/lib/invitation-codes';
import { setSessionCookie, generateJWT } from '@/lib/auth';
import { initializeDatabase, execute, queryOne } from '@/lib/db';
import { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    await initializeDatabase();

    const body = await request.json();
    const { email, password, passwordConfirm, invitationCode } = body;

    // Validate inputs
    if (!email || !password || !invitationCode) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, invitationCode' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password match
    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password does not meet strength requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Validate invitation code
    const codeValidation = await validateCode(invitationCode);
    if (!codeValidation.isValid) {
      return NextResponse.json(
        { error: codeValidation.message },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await queryOne<User>(
      'SELECT * FROM User WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    await execute(
      `INSERT INTO User (userId, email, passwordHash, role) 
       VALUES (?, ?, ?, ?)`,
      [userId, email, hashedPassword, 'user']
    );

    // Mark invitation code as used
    const codeId = codeValidation.invitationCode?.codeId;
    if (codeId) {
      await markCodeAsUsed(codeId, userId);
    }

    // Generate JWT and set session
    const token = generateJWT({ userId, email, role: 'user' });
    
    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: {
          userId,
          email,
          role: 'user',
        },
        token,
      },
      { status: 201 }
    );

    // Set session cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

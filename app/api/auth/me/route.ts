import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, queryOne } from '@/lib/db';
import { User } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    // Verify authentication from request headers
    const session = verifySessionFromRequest(request);
    
    if (!session) {
      console.error('Session verification failed');
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Get full user profile from database
    const user = await queryOne<User>(
      'SELECT userId, email, role, registrationDate, lastLoginDate FROM User WHERE userId = ?',
      [session.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          registrationDate: user.registrationDate,
          lastLoginDate: user.lastLoginDate,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

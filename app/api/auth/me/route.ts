import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest, requireAuth } from '@/lib/session';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = verifySessionFromRequest(request);
    if (!session) {
      // Check if requireAuth returns a NextResponse
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const session_verified = session || (typeof authResult !== 'undefined' && !(authResult instanceof NextResponse) ? authResult : null);
    if (!session_verified) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Get full user profile from database
    const user = await queryOne<User>(
      'SELECT userId, email, role, createdDate, lastLoginDate FROM User WHERE userId = ?',
      [session_verified.userId]
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
          createdDate: user.createdDate,
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

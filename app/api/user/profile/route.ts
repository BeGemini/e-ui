import { NextRequest, NextResponse } from 'next/server';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, execute, queryOne } from '@/lib/db';
import { UpdateProfileSchema } from '@/lib/validation';
import { User } from '@/lib/types';

export async function PATCH(request: NextRequest) {
  try {
    await initializeDatabase();

    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    await execute('UPDATE User SET name = ? WHERE userId = ?', [
      parsed.data.name,
      session.userId,
    ]);

    const user = await queryOne<User>(
      'SELECT userId, email, name, avatarUrl, role FROM User WHERE userId = ?',
      [session.userId]
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: user?.userId,
          email: user?.email,
          name: user?.name,
          avatarUrl: user?.avatarUrl,
          role: user?.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

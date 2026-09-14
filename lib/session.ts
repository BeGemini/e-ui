import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromHeader } from './auth';

const SESSION_COOKIE_NAME = 'auth-token';
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get current user session from cookies
 * @returns User session object or null if not authenticated
 */
export async function getCurrentSession(): Promise<{
  userId: string;
  email: string;
  role: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return null;
    }

    return {
      userId: decoded.userId as string,
      email: decoded.email as string,
      role: decoded.role as string,
    };
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Set authentication session cookie
 * @param token - JWT token to store
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear authentication session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verify session from request headers
 * @param request - Next.js request object
 * @returns User session object or null if not authenticated
 */
export function verifySessionFromRequest(request: NextRequest): {
  userId: string;
  email: string;
  role: string;
} | null {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader ?? undefined);

    if (!token) {
      return null;
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return null;
    }

    return {
      userId: decoded.userId as string,
      email: decoded.email as string,
      role: decoded.role as string,
    };
  } catch (error) {
    console.error('Error verifying session from request:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 * Checks both cookies and Authorization header
 */
export async function requireAuth(request: NextRequest): Promise<{
  userId: string;
  email: string;
  role: string;
} | NextResponse> {
  // Try Authorization header first (for API requests)
  const session = verifySessionFromRequest(request);
  if (session) {
    return session;
  }

  // Fallback to checking Authorization header in case it wasn't caught
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded) {
        return {
          userId: decoded.userId as string,
          email: decoded.email as string,
          role: decoded.role as string,
        };
      }
    }
  }

  // Return 401 Unauthorized
  return NextResponse.json(
    { error: 'Unauthorized: Authentication required' },
    { status: 401 }
  );
}

/**
 * Verify admin role
 * @param session - User session
 * @returns boolean - True if user is admin
 */
export function isAdmin(session: { role: string } | null): boolean {
  return session?.role === 'admin';
}

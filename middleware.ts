import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromHeader } from './lib/auth';

// Define protected routes
const protectedRoutes = ['/api/exercises', '/api/auth/me', '/api/practice', '/api/subtitles'];

export function middleware(request: NextRequest) {
  // Check if the requested path is protected
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute) {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    // Verify token
    if (!token || !verifyJWT(token)) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid token required' },
        { status: 401 }
      );
    }
  }

  // Allow request to proceed
  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Protect API routes that require authentication
    '/api/exercises/:path*',
    '/api/auth/me',
    '/api/practice/:path*',
    '/api/subtitles/:path*',
  ],
};

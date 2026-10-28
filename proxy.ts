import { NextRequest, NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = ['/api/exercises', '/api/auth/me', '/api/practice', '/api/subtitles'];

export function proxy(request: NextRequest) {
  // Check if the requested path is protected
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute) {
    // Just check if Authorization header exists
    // Actual JWT verification will happen in the route handlers (which run in Node.js runtime)
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      console.log(`[Middleware] Missing Authorization header for ${request.nextUrl.pathname}`);
      return NextResponse.json(
        { error: 'Unauthorized: Missing Authorization header' },
        { status: 401 }
      );
    }
    
    console.log(`[Middleware] Authorization header present for ${request.nextUrl.pathname}`);
  }

  // Allow request to proceed to route handler for verification
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

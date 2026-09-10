import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { initializeCosClient, getSignedUrl } from '@/lib/cos-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    // Initialize COS client
    initializeCosClient();

    // Get token from query parameter
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json(
        { error: 'Unauthorized: Missing token' },
        { status: 401 }
      );
    }

    console.log(`🔐 Token provided: ${token.substring(0, 30)}...`);

    // Verify token
    const payload = verifyJWT(token);
    if (!payload) {
      console.error('❌ Token verification failed');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
    
    console.log(`✅ Token verified for user: ${payload.email}`);

    // Get the video path from params
    const { key } = await params;
    const videoPath = key.join('/');

    console.log(`📹 Fetching video from COS: ${videoPath}`);

    // Build the signed URL using getSignedUrl
    const signedUrl = getSignedUrl(videoPath, 7200); // 2-hour expiry

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    console.log(`✅ Signed URL generated: ${signedUrl.substring(0, 100)}...`);

    // Prepare headers for COS request
    const cosHeaders = new Headers();
    
    // Forward Range header if present
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      cosHeaders.set('Range', rangeHeader);
      console.log(`📹 Forwarding range header: ${rangeHeader}`);
    }

    // Fetch the video from COS with streaming
    const videoResponse = await fetch(signedUrl, {
      method: 'GET',
      headers: cosHeaders,
    });

    if (!videoResponse.ok) {
      console.error(`❌ COS returned status ${videoResponse.status}`);
      return NextResponse.json(
        { error: `Failed to fetch video (${videoResponse.status})` },
        { status: videoResponse.status }
      );
    }

    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Copy important headers from COS response
    const contentType = videoResponse.headers.get('Content-Type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    } else {
      responseHeaders.set('Content-Type', 'video/mp4');
    }
    
    const contentLength = videoResponse.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    
    const contentRange = videoResponse.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }
    
    // Support range requests
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    // Return appropriate status code
    const status = videoResponse.status;

    return new NextResponse(videoResponse.body, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

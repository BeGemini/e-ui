import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { initializeCosClient, getSignedUrl } from '@/lib/cos-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing token' },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    const { key } = await params;
    const avatarPath = key.join('/');

    // Only proxy objects under the avatars/ prefix
    if (!avatarPath.startsWith('avatars/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    initializeCosClient();
    const signedUrl = getSignedUrl(avatarPath, 3600);

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('Avatar proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

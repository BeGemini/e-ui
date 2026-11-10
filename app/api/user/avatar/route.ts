import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionFromRequest } from '@/lib/session';
import { initializeDatabase, execute, queryOne } from '@/lib/db';
import { uploadFile, deleteFile, getBucketName, getRegion } from '@/lib/cos-client';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No avatar file provided' },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, webp, gif' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const key = `avatars/${session.userId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(key, buffer, file.type);

    // Remove the previous avatar from COS if it lives in our bucket
    const previous = await queryOne<{ avatarUrl: string | null }>(
      'SELECT avatarUrl FROM User WHERE userId = ?',
      [session.userId]
    );
    const bucketPrefix = `https://${getBucketName()}.cos.${getRegion()}.myqcloud.com/`;
    const oldKey = previous?.avatarUrl?.startsWith(bucketPrefix)
      ? previous.avatarUrl.slice(bucketPrefix.length)
      : previous?.avatarUrl;
    if (oldKey && oldKey !== key && oldKey.startsWith('avatars/')) {
      try {
        await deleteFile(oldKey);
      } catch (err) {
        console.warn(`Failed to delete old avatar ${oldKey}:`, err);
      }
    }

    // Store only the COS object key; avatars are served via /api/avatar/[...key]
    await execute('UPDATE User SET avatarUrl = ? WHERE userId = ?', [
      key,
      session.userId,
    ]);

    return NextResponse.json({ success: true, avatarUrl: key }, { status: 200 });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initializeDatabase();

    const session = verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const previous = await queryOne<{ avatarUrl: string | null }>(
      'SELECT avatarUrl FROM User WHERE userId = ?',
      [session.userId]
    );

    await execute('UPDATE User SET avatarUrl = NULL WHERE userId = ?', [
      session.userId,
    ]);

    // Remove the object from COS if it lives in our bucket
    const bucketPrefix = `https://${getBucketName()}.cos.${getRegion()}.myqcloud.com/`;
    const oldKey = previous?.avatarUrl?.startsWith(bucketPrefix)
      ? previous.avatarUrl.slice(bucketPrefix.length)
      : previous?.avatarUrl;
    if (oldKey?.startsWith('avatars/')) {
      try {
        await deleteFile(oldKey);
      } catch (err) {
        console.warn(`Failed to delete avatar ${oldKey}:`, err);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

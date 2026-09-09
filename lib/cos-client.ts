/**
 * Tencent COS (Cloud Object Storage) Client Wrapper
 * Provides utilities for interacting with Tencent COS
 */

import COS from 'cos-nodejs-sdk-v5';
import type { CosConfig } from './types';

let cosClient: COS | null = null;

/**
 * Initialize the Tencent COS client
 */
export function initializeCosClient(): COS {
  if (cosClient) {
    return cosClient;
  }

  const config: CosConfig = {
    region: process.env.COS_REGION || 'ap-beijing',
    bucket: process.env.COS_BUCKET || '',
    secretId: process.env.COS_SECRET_ID || '',
    secretKey: process.env.COS_SECRET_KEY || '',
  };

  if (!config.bucket || !config.secretId || !config.secretKey) {
    throw new Error('COS configuration incomplete: BUCKET, SECRET_ID, SECRET_KEY required');
  }

  cosClient = new COS({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
  });

  console.log(`✅ Tencent COS client initialized for bucket: ${config.bucket}`);
  return cosClient;
}

/**
 * Get the COS client instance
 */
export function getCosClient(): COS {
  if (!cosClient) {
    throw new Error('COS client not initialized. Call initializeCosClient() first.');
  }
  return cosClient;
}

/**
 * Get the bucket name from environment
 */
export function getBucketName(): string {
  const bucket = process.env.COS_BUCKET;
  if (!bucket) {
    throw new Error('COS_BUCKET environment variable is not set');
  }
  return bucket;
}

/**
 * Get the region from environment
 */
export function getRegion(): string {
  return process.env.COS_REGION || 'ap-beijing';
}

/**
 * Upload a file to COS
 * @param key - File path in COS (e.g., "videos/episode-1.mp4")
 * @param fileContent - File content (Buffer or string)
 * @returns Full COS URL
 */
export async function uploadFile(
  key: string,
  fileContent: Buffer | string
): Promise<string> {
  const client = getCosClient();
  const bucket = getBucketName();
  const region = getRegion();

  return new Promise((resolve, reject) => {
    client.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: fileContent,
      },
      (err) => {
        if (err) {
          console.error(`❌ COS upload failed for ${key}:`, err);
          reject(err);
        } else {
          const url = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
          console.log(`✅ Uploaded to COS: ${url}`);
          resolve(url);
        }
      }
    );
  });
}

/**
 * Download a file from COS
 * @param key - File path in COS
 * @returns File content as Buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getCosClient();
  const bucket = getBucketName();
  const region = getRegion();

  return new Promise((resolve, reject) => {
    client.getObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
      },
      (err, data) => {
        if (err) {
          console.error(`❌ COS download failed for ${key}:`, err);
          reject(err);
        } else {
          resolve(data.Body as Buffer);
        }
      }
    );
  });
}

/**
 * Delete a file from COS
 * @param key - File path in COS
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getCosClient();
  const bucket = getBucketName();
  const region = getRegion();

  return new Promise((resolve, reject) => {
    client.deleteObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
      },
      (err) => {
        if (err) {
          console.error(`❌ COS delete failed for ${key}:`, err);
          reject(err);
        } else {
          console.log(`✅ Deleted from COS: ${key}`);
          resolve();
        }
      }
    );
  });
}

/**
 * List files in a COS directory
 * @param prefix - Directory prefix (e.g., "videos/")
 * @returns List of file keys
 */
export async function listFiles(prefix: string = ''): Promise<string[]> {
  const client = getCosClient();
  const bucket = getBucketName();
  const region = getRegion();

  return new Promise((resolve, reject) => {
    client.getBucket(
      {
        Bucket: bucket,
        Region: region,
        Prefix: prefix,
      },
      (err, responseData: { Contents?: Array<{ Key: string }> } | undefined) => {
        if (err) {
          console.error(`❌ COS list failed for prefix ${prefix}:`, err);
          reject(err);
        } else {
          const keys = (responseData?.Contents || []).map((item) => item.Key);
          resolve(keys);
        }
      }
    );
  });
}

/**
 * Check if a file exists in COS
 * @param key - File path in COS
 * @returns true if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const client = getCosClient();
    const bucket = getBucketName();
    const region = getRegion();

    return new Promise((resolve) => {
      client.headObject(
        {
          Bucket: bucket,
          Region: region,
          Key: key,
        },
        (err) => {
          resolve(!err);
        }
      );
    });
  } catch {
    return false;
  }
}

/**
 * Get a signed COS URL (useful for sharing or direct access)
 * @param key - File path in COS
 * @param expireSeconds - URL expiration time in seconds (default: 3600)
 * @returns Signed URL
 */
export function getSignedUrl(key: string, expireSeconds: number = 3600): string {
  const client = getCosClient();
  const bucket = getBucketName();
  const region = getRegion();

  try {
    return client.getObjectUrl(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Expires: expireSeconds,
        Sign: true,
      },
      (err) => {
        if (err) {
          console.error(`❌ Failed to generate signed URL for ${key}:`, err);
        }
      }
    ) || '';
  } catch (error) {
    console.error(`❌ Error generating signed URL for ${key}:`, error);
    return '';
  }
}

/**
 * Get a public COS URL (unsigned, for files that allow public access)
 * @param key - File path in COS
 * @returns Public URL
 */
export function getPublicUrl(key: string): string {
  const bucket = getBucketName();
  const region = getRegion();
  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
}

/**
 * Health check for COS connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const bucket = getBucketName();
    const region = getRegion();
    const client = getCosClient();

    return new Promise((resolve) => {
      client.headBucket(
        {
          Bucket: bucket,
          Region: region,
        },
        (err) => {
          resolve(!err);
        }
      );
    });
  } catch (error) {
    console.error('COS health check failed:', error);
    return false;
  }
}

const cosClientModule = {
  initializeCosClient,
  getCosClient,
  getBucketName,
  getRegion,
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  fileExists,
  getSignedUrl,
  getPublicUrl,
  healthCheck,
};

export default cosClientModule;

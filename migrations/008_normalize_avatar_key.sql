-- Normalize avatarUrl to store only the COS object key (bucket is private-read;
-- avatars are served through /api/avatar/[...key] with a signed URL)
UPDATE User
SET avatarUrl = SUBSTRING_INDEX(avatarUrl, '.myqcloud.com/', -1)
WHERE avatarUrl LIKE '%.myqcloud.com/%';

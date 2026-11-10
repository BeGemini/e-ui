-- Optional display name (falls back to email prefix in UI when NULL)
ALTER TABLE User ADD COLUMN name VARCHAR(100) NULL COMMENT 'User display name' AFTER email;

-- Avatar image URL (stored in Tencent COS)
ALTER TABLE User ADD COLUMN avatarUrl VARCHAR(512) NULL COMMENT 'Avatar image URL in COS' AFTER name;

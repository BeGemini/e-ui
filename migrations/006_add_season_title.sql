-- Optional custom display name for a season (falls back to "Season N" when NULL)
ALTER TABLE Season ADD COLUMN title VARCHAR(255) NULL COMMENT 'Custom season name' AFTER seasonNumber;

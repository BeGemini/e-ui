-- Migration: Add effectiveSentenceCount to UserSubtitleConfig
-- Tracks the number of sentences after applying merge/skip config per user.

ALTER TABLE UserSubtitleConfig
ADD COLUMN effectiveSentenceCount INT NULL COMMENT 'Number of effective sentences after merge/skip (computed)';

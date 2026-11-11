-- Add a fallback video source to Exercise.
-- For TED Talks the primary videoUrl is TED's HLS stream; videoFallbackUrl
-- holds the COS copy the player switches to when the primary source times out.

ALTER TABLE Exercise
  ADD COLUMN videoFallbackUrl VARCHAR(500) NULL COMMENT 'Backup video (COS key) used when the primary source fails, e.g. TED HLS timeout' AFTER videoUrl;

-- Add whole-video subtitle timing controls to the per-user subtitle config.
-- globalTimeOffsetMs shifts every sentence by the same amount; timingMode
-- selects whether per-sentence adjustments or the global offset is in effect
-- (the two are stored independently, only one applies at a time).

ALTER TABLE UserSubtitleConfig
  ADD COLUMN globalTimeOffsetMs INT NOT NULL DEFAULT 0 COMMENT 'Whole-video subtitle offset in milliseconds (negative = earlier)' AFTER timeAdjustments,
  ADD COLUMN timingMode ENUM('sentence','global') NOT NULL DEFAULT 'sentence' COMMENT 'Which timing adjustment applies: per-sentence overrides or the global offset' AFTER globalTimeOffsetMs;

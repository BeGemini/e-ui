-- Move per-sentence timing overrides from Exercise (global) to
-- UserSubtitleConfig (per-user), matching the scope of merge/skip config.
-- Any values already saved on Exercise.timeAdjustments are discarded.

ALTER TABLE UserSubtitleConfig
  ADD COLUMN timeAdjustments JSON NULL COMMENT 'Array of {index, startSeconds?, endSeconds?} timing overrides by original subtitle index' AFTER skippedSentences;

ALTER TABLE Exercise
  DROP COLUMN timeAdjustments;

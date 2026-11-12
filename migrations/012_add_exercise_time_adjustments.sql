-- Add per-sentence timing overrides to Exercise.
-- Auto-generated subtitles sometimes have individual cues that are slightly
-- off; these adjustments (original subtitle index -> new start/end) apply to
-- all users without modifying the source subtitle file on COS.

ALTER TABLE Exercise
  ADD COLUMN timeAdjustments JSON NULL COMMENT 'Array of {index, startSeconds?, endSeconds?} timing overrides by original subtitle index' AFTER subtitleFormat;

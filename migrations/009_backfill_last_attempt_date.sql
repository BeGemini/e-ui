-- Backfill UserExerciseProgress.lastAttemptDate from the attempts table.
-- The practice flow never wrote this column before, so "recently practiced"
-- queries found nothing for existing progress rows.
UPDATE UserExerciseProgress p
SET p.lastAttemptDate = (
  SELECT MAX(a.attemptDate)
  FROM UserDictationAttempt a
  WHERE a.progressId = p.progressId
)
WHERE p.lastAttemptDate IS NULL;

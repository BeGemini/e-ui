-- Enforce one dictation attempt per (progressId, sentenceIndex)
-- Feature 008: each learner keeps exactly one saved answer per sentence; later saves overwrite it.
-- The migration script connects to the database named in DATABASE_URL.
--
-- WARNING: Step 1 IRREVERSIBLY DELETES historical duplicate attempts for the same sentence,
-- keeping only the most recent row (latest attemptDate; ties broken by the larger attemptId).
-- Back up the table before deploying, e.g.:
--   mysqldump <db> UserDictationAttempt > backup-UserDictationAttempt-<date>.sql
--
-- Do NOT drop the existing idx_progress index: it is used by the progressId foreign key.

-- 1. Remove older duplicates, keeping the newest attempt for each sentence
DELETE older FROM UserDictationAttempt older
JOIN UserDictationAttempt newer
  ON older.progressId = newer.progressId
 AND older.sentenceIndex = newer.sentenceIndex
 AND (older.attemptDate < newer.attemptDate
      OR (older.attemptDate = newer.attemptDate AND older.attemptId < newer.attemptId));

-- 2. Add the unique constraint used by INSERT ... ON DUPLICATE KEY UPDATE
ALTER TABLE UserDictationAttempt ADD UNIQUE INDEX uq_progress_sentence (progressId, sentenceIndex);

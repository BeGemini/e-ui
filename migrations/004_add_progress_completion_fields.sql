-- Add exercise completion fields to UserExerciseProgress
-- Used by save-progress route, dashboard, and completion page
-- The migration script connects to the database named in DATABASE_URL.

ALTER TABLE UserExerciseProgress
ADD COLUMN overallAccuracy DECIMAL(5, 2) NULL COMMENT 'Average accuracy across non-skipped attempts, set on completion',
ADD COLUMN completedDate TIMESTAMP NULL COMMENT 'When the exercise was marked completed';

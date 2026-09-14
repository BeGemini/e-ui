-- Exercise Knowledge Points - Database Schema Update
-- MySQL 8.0+
-- Created: 2026-09-13

USE english_listening_db;

-- KnowledgePoint (知识点 - Learning Note)
CREATE TABLE IF NOT EXISTS KnowledgePoint (
  knowledgePointId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  userId CHAR(36) NOT NULL COMMENT 'Reference to User',
  exerciseId CHAR(36) NOT NULL COMMENT 'Reference to Exercise',
  sourceSentenceIndex INT NOT NULL COMMENT '0-based effective sentence index within the exercise',
  capturedText VARCHAR(500) NOT NULL COMMENT 'Captured substring after whole-word normalization',
  category ENUM('word', 'phrase', 'sentence') NOT NULL COMMENT 'Knowledge point category',
  description TEXT NOT NULL COMMENT 'User note',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise_text (userId, exerciseId, capturedText),
  INDEX idx_user_exercise (userId, exerciseId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

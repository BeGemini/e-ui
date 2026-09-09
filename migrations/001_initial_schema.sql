-- English Listening Dictation Practice App - Database Schema
-- MySQL 8.0+
-- Created: 2026-09-09

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS english_listening_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_listening_db;

-- ===== CONTENT ENTITIES =====

-- Series (电视剧 - Show)
CREATE TABLE IF NOT EXISTS Series (
  seriesId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  title VARCHAR(255) NOT NULL UNIQUE COMMENT 'Series title',
  description TEXT COMMENT 'Long-form description',
  genre VARCHAR(100) COMMENT 'e.g., Drama, Comedy',
  difficulty ENUM('beginner', 'intermediate', 'advanced') NOT NULL COMMENT 'English level',
  coverImageUrl VARCHAR(500) COMMENT 'COS URL to cover image',
  totalEpisodes INT DEFAULT 0 COMMENT 'Computed from Episode count',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When series was added',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last modification',
  INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Season (季 - Season)
CREATE TABLE IF NOT EXISTS Season (
  seasonId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  seriesId CHAR(36) NOT NULL COMMENT 'Reference to Series',
  seasonNumber INT NOT NULL COMMENT 'Season number (1, 2, 3, ...)',
  description TEXT COMMENT 'Season description',
  totalEpisodes INT DEFAULT 0 COMMENT 'Computed from Episode count',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When season was added',
  FOREIGN KEY (seriesId) REFERENCES Series(seriesId) ON DELETE CASCADE,
  UNIQUE INDEX idx_series_season (seriesId, seasonNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Episode (集 - Episode)
CREATE TABLE IF NOT EXISTS Episode (
  episodeId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  seasonId CHAR(36) NOT NULL COMMENT 'Reference to Season',
  episodeNumber INT NOT NULL COMMENT 'Episode number within season (1, 2, 3, ...)',
  title VARCHAR(255) NOT NULL COMMENT 'Episode title',
  description TEXT COMMENT 'Episode description',
  totalExercises INT DEFAULT 0 COMMENT 'Computed from Exercise count',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When episode was added',
  FOREIGN KEY (seasonId) REFERENCES Season(seasonId) ON DELETE CASCADE,
  UNIQUE INDEX idx_season_episode (seasonId, episodeNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercise (练习 - Practice Exercise)
CREATE TABLE IF NOT EXISTS Exercise (
  exerciseId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  episodeId CHAR(36) NOT NULL COMMENT 'Reference to Episode',
  videoUrl VARCHAR(500) NOT NULL COMMENT 'Full URL to video on Tencent COS',
  subtitleUrl VARCHAR(500) NOT NULL COMMENT 'Full URL to subtitle file on Tencent COS',
  subtitleFormat ENUM('srt', 'vtt', 'ssa', 'ass') NOT NULL COMMENT 'Subtitle file format',
  totalSentences INT NOT NULL COMMENT 'Total subtitle sentences (computed at creation)',
  durationSeconds INT NOT NULL COMMENT 'Video duration in seconds',
  difficulty ENUM('beginner', 'intermediate', 'advanced') COMMENT 'Override series difficulty',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When exercise was added',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last modification',
  FOREIGN KEY (episodeId) REFERENCES Episode(episodeId) ON DELETE CASCADE,
  INDEX idx_episode (episodeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== USER ENTITIES =====

-- User (用户 - User Account)
CREATE TABLE IF NOT EXISTS User (
  userId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email address (login credential)',
  passwordHash VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user' COMMENT 'User role',
  registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When account was created',
  lastLoginDate TIMESTAMP NULL COMMENT 'Last login timestamp',
  isActive BOOLEAN DEFAULT TRUE COMMENT 'Account status (false = deleted/suspended)',
  UNIQUE INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- InvitationCode (邀请码 - Access Token)
CREATE TABLE IF NOT EXISTS InvitationCode (
  codeId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'The actual code (e.g., ABC123XYZ)',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When code was generated',
  expiryDate TIMESTAMP NOT NULL COMMENT 'When code expires',
  isUsed BOOLEAN DEFAULT FALSE COMMENT 'Whether code has been used',
  usedByUserId CHAR(36) NULL COMMENT 'Which user registered with this code',
  FOREIGN KEY (usedByUserId) REFERENCES User(userId) ON DELETE SET NULL,
  INDEX idx_expiry (expiryDate),
  INDEX idx_used (isUsed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== PROGRESS & PRACTICE ENTITIES =====

-- UserExerciseProgress (用户练习进度 - User Exercise Progress)
CREATE TABLE IF NOT EXISTS UserExerciseProgress (
  progressId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  userId CHAR(36) NOT NULL COMMENT 'Reference to User',
  exerciseId CHAR(36) NOT NULL COMMENT 'Reference to Exercise',
  currentSentenceIndex INT NOT NULL DEFAULT 0 COMMENT 'Last completed sentence (0-based), inclusive boundary for edit permissions',
  isCompleted BOOLEAN DEFAULT FALSE COMMENT 'Whether user finished all sentences',
  lastAttemptDate TIMESTAMP NULL COMMENT 'Timestamp of last attempt',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When practice started',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise (userId, exerciseId),
  INDEX idx_completed (isCompleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UserDictationAttempt (用户听写尝试 - Dictation Attempt History)
CREATE TABLE IF NOT EXISTS UserDictationAttempt (
  attemptId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  progressId CHAR(36) NOT NULL COMMENT 'Reference to UserExerciseProgress',
  sentenceIndex INT NOT NULL COMMENT 'Which sentence in the exercise (0-based)',
  userInput TEXT NOT NULL COMMENT 'User typed text',
  correctAnswer TEXT NOT NULL COMMENT 'Correct subtitle text',
  accuracy DECIMAL(5, 2) NOT NULL COMMENT 'Accuracy percentage (0-100)',
  wordFeedback JSON COMMENT 'Array of {word, userWord, status} objects',
  attemptDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When attempt was made',
  FOREIGN KEY (progressId) REFERENCES UserExerciseProgress(progressId) ON DELETE CASCADE,
  INDEX idx_progress (progressId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UserSubtitleConfig (用户字幕配置 - User-Specific Subtitle Settings)
CREATE TABLE IF NOT EXISTS UserSubtitleConfig (
  configId CHAR(36) PRIMARY KEY COMMENT 'UUID',
  userId CHAR(36) NOT NULL COMMENT 'Reference to User',
  exerciseId CHAR(36) NOT NULL COMMENT 'Reference to Exercise',
  mergedGroups JSON COMMENT 'Array of {startIndex, endIndex, label} merged sentence groups',
  skippedSentences JSON COMMENT 'Array of sentence indices to skip during playback',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When config was created',
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
  FOREIGN KEY (userId) REFERENCES User(userId) ON DELETE CASCADE,
  FOREIGN KEY (exerciseId) REFERENCES Exercise(exerciseId) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_exercise_config (userId, exerciseId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== INDEXES SUMMARY =====
-- Performance-critical indexes already created above:
-- 1. UserExerciseProgress(userId, exerciseId) - Resume exercise flow
-- 2. UserDictationAttempt(progressId) - Retrieve attempt history
-- 3. UserSubtitleConfig(userId, exerciseId) - Load subtitle config
-- 4. InvitationCode(code) - Validate registration code

-- ===== VERIFICATION =====
-- Run this to verify schema:
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'english_listening_db';

/**
 * Database Seed Script for Development
 * Run with: npm run db:seed
 *
 * Creates sample data:
 * - 3 Series (TV shows)
 * - 2-3 Seasons per Series
 * - 3 Episodes per Season
 * - 2 Exercises per Episode
 * - Sample Users and Invitation Codes
 */

import { v4 as uuidv4 } from 'uuid';
import * as bcryptjs from 'bcryptjs';
import { initializeDatabase, query, execute, closeDatabase } from '../lib/db';

// Sample data
const SAMPLE_SERIES = [
  {
    title: '绝望的主妇 (Desperate Housewives)',
    genre: 'Drama',
    difficulty: 'intermediate',
    description: 'A black comedy-drama series centered on the residents of Wisteria Lane',
  },
  {
    title: '老友记 (Friends)',
    genre: 'Comedy',
    difficulty: 'beginner',
    description: 'A sitcom about six friends living in New York City',
  },
  {
    title: '权力的游戏 (Game of Thrones)',
    genre: 'Drama',
    difficulty: 'advanced',
    description: 'An epic fantasy drama series with complex political intrigue',
  },
];

// Load environment variables from .env.local
function loadEnvFile() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');
    await initializeDatabase();

    // Clear existing data (be careful in production!)
    console.log('🗑️  Clearing existing data...');
    await execute('DELETE FROM UserSubtitleConfig');
    await execute('DELETE FROM UserDictationAttempt');
    await execute('DELETE FROM UserExerciseProgress');
    await execute('DELETE FROM InvitationCode');
    await execute('DELETE FROM User');
    await execute('DELETE FROM Exercise');
    await execute('DELETE FROM Episode');
    await execute('DELETE FROM Season');
    await execute('DELETE FROM Series');

    // Seed Series and hierarchy
    console.log('📺 Creating Series, Seasons, Episodes, and Exercises...');
    for (const seriesData of SAMPLE_SERIES) {
      const seriesId = uuidv4();
      const difficulty = seriesData.difficulty as 'beginner' | 'intermediate' | 'advanced';

      await execute(
        `INSERT INTO Series (seriesId, title, genre, difficulty, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [seriesId, seriesData.title, seriesData.genre, difficulty, seriesData.description]
      );

      // Create 2-3 seasons per series
      const numSeasons = Math.floor(Math.random() * 2) + 2;
      for (let seasonNum = 1; seasonNum <= numSeasons; seasonNum++) {
        const seasonId = uuidv4();
        await execute(
          `INSERT INTO Season (seasonId, seriesId, seasonNumber, description) 
           VALUES (?, ?, ?, ?)`,
          [seasonId, seriesId, seasonNum, `Season ${seasonNum} of ${seriesData.title}`]
        );

        // Create 3 episodes per season
        for (let episodeNum = 1; episodeNum <= 3; episodeNum++) {
          const episodeId = uuidv4();
          await execute(
            `INSERT INTO Episode (episodeId, seasonId, episodeNumber, title, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              episodeId,
              seasonId,
              episodeNum,
              `Episode ${episodeNum}`,
              `${seriesData.title} - Season ${seasonNum}, Episode ${episodeNum}`,
            ]
          );

          // Create 2 exercises per episode
          for (let exNum = 1; exNum <= 2; exNum++) {
            const exerciseId = uuidv4();
            const videoUrl = `https://english-listening-dev.cos.ap-beijing.myqcloud.com/videos/${seriesData.title
              .replace(/\s+/g, '-')
              .toLowerCase()}-s${seasonNum}e${episodeNum}-ex${exNum}.mp4`;
            const subtitleUrl = `https://english-listening-dev.cos.ap-beijing.myqcloud.com/subtitles/${seriesData.title
              .replace(/\s+/g, '-')
              .toLowerCase()}-s${seasonNum}e${episodeNum}-ex${exNum}.srt`;

            await execute(
              `INSERT INTO Exercise (exerciseId, episodeId, videoUrl, subtitleUrl, subtitleFormat, totalSentences, durationSeconds, difficulty) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                exerciseId,
                episodeId,
                videoUrl,
                subtitleUrl,
                'srt',
                Math.floor(Math.random() * 30) + 20, // 20-50 sentences
                Math.floor(Math.random() * 300) + 300, // 5-10 minutes
                difficulty,
              ]
            );
          }
        }
      }
    }

    // Create sample users
    console.log('👥 Creating sample users...');
    const sampleUsers = [
      { email: 'student@example.com', password: 'Student123!', role: 'user' },
      { email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
      { email: 'learner@example.com', password: 'Learner123!', role: 'user' },
    ];

    const userIds: string[] = [];
    for (const userData of sampleUsers) {
      const userId = uuidv4();
      const passwordHash = await bcryptjs.hash(userData.password, 12);

      await execute(
        `INSERT INTO User (userId, email, passwordHash, role, isActive) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, userData.email, passwordHash, userData.role, true]
      );

      userIds.push(userId);
      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    }

    // Create invitation codes
    console.log('🎟️  Creating invitation codes...');
    const numCodes = 10;
    for (let i = 0; i < numCodes; i++) {
      const codeId = uuidv4();
      const code = `CODE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const isUsed = i < userIds.length - 1; // First two codes already used
      const usedByUserId = isUsed ? userIds[i] : null;

      await execute(
        `INSERT INTO InvitationCode (codeId, code, expiryDate, isUsed, usedByUserId) 
         VALUES (?, ?, ?, ?, ?)`,
        [codeId, code, expiryDate.toISOString().split('T')[0], isUsed, usedByUserId]
      );

      if (!isUsed) {
        console.log(`✅ Created invitation code: ${code} (expires: ${expiryDate.toLocaleDateString()})`);
      }
    }

    // Create sample progress for first user
    console.log('📊 Creating sample progress records...');
    const exercises = await query<Array<{ exerciseId: string }>>(
      'SELECT exerciseId FROM Exercise LIMIT 5'
    );

    for (const [index, exercise] of exercises.entries()) {
      const progressId = uuidv4();
      const currentSentenceIndex = Math.floor(Math.random() * 5);
      const isCompleted = index % 3 === 0; // 1/3 are completed

      await execute(
        `INSERT INTO UserExerciseProgress (progressId, userId, exerciseId, currentSentenceIndex, isCompleted) 
         VALUES (?, ?, ?, ?, ?)`,
        [progressId, userIds[0], exercise.exerciseId, currentSentenceIndex, isCompleted]
      );
    }

    console.log('✅ Database seed completed successfully!');
    console.log('\n📝 Sample Login Credentials:');
    console.log('   Student: student@example.com / Student123!');
    console.log('   Admin: admin@example.com / Admin123!');
    console.log('   Learner: learner@example.com / Learner123!');
    console.log('\n📝 Available invitation codes (unused):');

    const unusedCodes = await query<Array<{ code: string; expiryDate: string }>>(
      'SELECT code, expiryDate FROM InvitationCode WHERE isUsed = FALSE LIMIT 3'
    );
    for (const record of unusedCodes) {
      console.log(`   ${record.code} (expires: ${record.expiryDate})`);
    }

  } catch (error) {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run seed
seedDatabase();

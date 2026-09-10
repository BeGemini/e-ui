#!/usr/bin/env node

import mysql from 'mysql2/promise';

async function insertData() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Hhl@0048',
      database: 'english_listening_db',
    });

    console.log('✅ Connected to database\n');

    // Generate UUIDs using SQL
    const queries = [
      // Insert Series
      `INSERT INTO Series (seriesId, title, description, genre, difficulty, coverImageUrl)
       VALUES (UUID(), 'Desperate Housewives', 'A dramedy following four housewives on Wisteria Lane as they navigate relationships, scandals, and secrets.', 'Drama/Comedy', 'intermediate', 'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/covers/Desperate_Housewives.jpg')`,
      
      // We need to get the series ID for the next insert
      // So we'll use a different approach
    ];

    // Get the max seriesId to confirm insert
    const [[{ lastSeriesId }]] = await connection.execute(
      `SELECT MAX(CAST(SUBSTR(seriesId, 1, 8) AS UNSIGNED)) as maxId 
       FROM Series 
       WHERE title = 'Desperate Housewives'`
    );

    // Actually, let's just insert step by step and use transactions

    // Insert Series
    const [seriesResult] = await connection.execute(
      `INSERT INTO Series (seriesId, title, description, genre, difficulty, coverImageUrl)
       VALUES (UUID(), 'Desperate Housewives', 'A dramedy following four housewives on Wisteria Lane as they navigate relationships, scandals, and secrets.', 'Drama/Comedy', 'intermediate', 'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/covers/Desperate_Housewives.jpg')`
    );
    console.log('✅ Series inserted');

    // Get the series ID we just created
    const [[{ seriesId }]] = await connection.execute(
      `SELECT seriesId FROM Series WHERE title = 'Desperate Housewives' ORDER BY createdDate DESC LIMIT 1`
    );
    console.log('   Series ID:', seriesId);

    // Insert Season
    const [seasonResult] = await connection.execute(
      `INSERT INTO Season (seasonId, seriesId, seasonNumber, description)
       VALUES (UUID(), ?, 1, 'Season 1')`,
      [seriesId]
    );
    console.log('✅ Season inserted');

    // Get the season ID
    const [[{ seasonId }]] = await connection.execute(
      `SELECT seasonId FROM Season WHERE seriesId = ? ORDER BY createdDate DESC LIMIT 1`,
      [seriesId]
    );
    console.log('   Season ID:', seasonId);

    // Insert Episode
    const [episodeResult] = await connection.execute(
      `INSERT INTO Episode (episodeId, seasonId, episodeNumber, title, description)
       VALUES (UUID(), ?, 1, 'Pilot', 'The series premiere introduces us to the residents of Wisteria Lane.')`,
      [seasonId]
    );
    console.log('✅ Episode inserted');

    // Get the episode ID
    const [[{ episodeId }]] = await connection.execute(
      `SELECT episodeId FROM Episode WHERE seasonId = ? ORDER BY createdDate DESC LIMIT 1`,
      [seasonId]
    );
    console.log('   Episode ID:', episodeId);

    // Insert Exercise
    const [exerciseResult] = await connection.execute(
      `INSERT INTO Exercise (exerciseId, episodeId, title, videoUrl, subtitleFormat, subtitleUrl, totalSentences, durationSeconds, difficulty)
       VALUES (UUID(), ?, ?, ?, 'ass', ?, 150, 1800, 'intermediate')`,
      [
        episodeId,
        'Full Version',
        'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.mp4',
        'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.ass',
      ]
    );
    console.log('✅ Exercise inserted');

    // Get the exercise ID
    const [[{ exerciseId }]] = await connection.execute(
      `SELECT exerciseId FROM Exercise WHERE episodeId = ? ORDER BY createdDate DESC LIMIT 1`,
      [episodeId]
    );
    console.log('   Exercise ID:', exerciseId);

    console.log('\n✅ All data inserted successfully!\n');
    console.log('You can now test the app:');
    console.log('1. Login at http://localhost:3000');
    console.log('2. Go to dashboard at http://localhost:3000/dashboard');
    console.log('3. Click on "Desperate Housewives" to see the exercise');
    console.log('4. Click "Start Practice" to begin\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

insertData();

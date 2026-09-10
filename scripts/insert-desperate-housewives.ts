import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, execute } from '../lib/db';

/**
 * Insert real data: Desperate Housewives S01E01
 */
async function insertTestData() {
  try {
    await initializeDatabase();
    console.log('📡 Database connected\n');

    // Create Series
    const seriesId = uuidv4();
    await execute(
      `INSERT INTO Series (seriesId, title, description, genre, difficulty, coverImageUrl)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        seriesId,
        'Desperate Housewives',
        'A dramedy following four housewives on Wisteria Lane as they navigate relationships, scandals, and secrets.',
        'Drama/Comedy',
        'intermediate',
        'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/covers/Desperate_Housewives.jpg',
      ]
    );
    console.log('✅ Series created:', seriesId);

    // Create Season
    const seasonId = uuidv4();
    await execute(
      `INSERT INTO Season (seasonId, seriesId, seasonNumber, description)
       VALUES (?, ?, ?, ?)`,
      [seasonId, seriesId, 1, 'Season 1']
    );
    console.log('✅ Season created:', seasonId);

    // Create Episode
    const episodeId = uuidv4();
    await execute(
      `INSERT INTO Episode (episodeId, seasonId, episodeNumber, title, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        episodeId,
        seasonId,
        1,
        'Pilot',
        'The series premiere introduces us to the residents of Wisteria Lane.',
      ]
    );
    console.log('✅ Episode created:', episodeId);

    // Create Exercise
    const exerciseId = uuidv4();
    await execute(
      `INSERT INTO Exercise (exerciseId, episodeId, title, difficulty, videoUrl, subtitleFormat, subtitleUrl, totalSentences, durationSeconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exerciseId,
        episodeId,
        'Full Version',
        'intermediate',
        'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.mp4',
        'ass',
        'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.ass',
        150,
        1800,
      ]
    );
    console.log('✅ Exercise created:', exerciseId);

    console.log('\n✅ All data inserted successfully!');
    console.log('\nYou can now:');
    console.log(`1. Login at http://localhost:3000`);
    console.log(`2. Go to dashboard at http://localhost:3000/dashboard`);
    console.log(`3. Click on "Desperate Housewives" to see the exercise`);
    console.log(`4. Click "Start Practice" to begin`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting data:', error);
    process.exit(1);
  }
}

insertTestData();

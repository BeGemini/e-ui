import fs from 'fs';
import path from 'path';
import { initializeDatabase, execute, closeDatabase } from '../lib/db';

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
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

async function fixSubtitleUrls() {
  await initializeDatabase();
  const result = await execute(
    `UPDATE Exercise
     SET subtitleUrl = 'Desperate Hosewives/S01/E01.ass',
         videoUrl = 'Desperate Hosewives/S01/E01.mp4'
     WHERE exerciseId = '165ec8c5-b8c0-449a-8d8b-bdaaeb074154'`
  );
  console.log('Updated rows:', result.affectedRows);
  await closeDatabase();
}

fixSubtitleUrls().catch(console.error);

/**
 * Database Migration Script
 * Reads and executes SQL migration files without requiring MySQL CLI
 * Run with: npm run db:migrate
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

// Load environment variables from .env.local
function loadEnvFile() {
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

async function runMigration() {
  // Parse database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = parseInt(url.port || '3306', 10);
  const database = url.pathname.slice(1);

  try {
    console.log(`🔄 Connecting to MySQL at ${host}:${port}...`);

    // First connection without database to create it
    const connectionWithoutDb = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL server');

    // Create database if not exists
    console.log(`📦 Creating database "${database}" if not exists...`);
    await connectionWithoutDb.query(
      `CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${database}" ready`);

    await connectionWithoutDb.end();

    // Now connect to the specific database
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });

    console.log(`✅ Connected to database "${database}"`);

    // Ensure migration tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS __migrations (
        filename VARCHAR(255) PRIMARY KEY,
        appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Discover all migration files in order
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.error(`❌ No migration files found in ${migrationsDir}`);
      await connection.end();
      process.exit(1);
    }

    // Determine already-applied migrations
    const [appliedRows] = await connection.query(
      'SELECT filename FROM __migrations'
    );
    const appliedFiles = new Set(
      (appliedRows as Array<{ filename: string }>).map((row) => row.filename)
    );

    console.log(`📄 Found ${migrationFiles.length} migration file(s)`);

    for (const migrationFile of migrationFiles) {
      if (appliedFiles.has(migrationFile)) {
        console.log(`⏭️  Skipping already applied ${migrationFile}`);
        continue;
      }

      const migrationPath = path.join(migrationsDir, migrationFile);
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      console.log(`🔄 Applying ${migrationFile}...`);

      try {
        await connection.query(sqlContent);
      } catch (error) {
        const err = error as { code?: string };
        if (
          err.code === 'ER_DUP_FIELDNAME' ||
          err.code === 'ER_TABLE_EXISTS_ERROR' ||
          err.code === 'ER_DUP_KEYNAME' ||
          err.code === 'ER_CANT_DROP_FIELD_OR_KEY'
        ) {
          console.log(`⚠️  ${migrationFile} appears already applied (ignored duplicate)`);
        } else {
          throw error;
        }
      }

      await connection.query('INSERT INTO __migrations (filename) VALUES (?)', [
        migrationFile,
      ]);
    }

    console.log(`✅ All migrations applied successfully`);

    // Verify tables
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [database]
    );

    const tableCount = (rows as Array<{ TABLE_NAME: string }>).length;
    console.log(`✅ Database now contains ${tableCount} tables`);

    // List tables
    console.log('\n📋 Created tables:');
    for (const row of rows as Array<{ TABLE_NAME: string }>) {
      console.log(`   • ${row.TABLE_NAME}`);
    }

    await connection.end();

    console.log('\n✅ Migration completed successfully!');
    console.log('Next step: npm run db:seed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

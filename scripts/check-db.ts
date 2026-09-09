/**
 * Database Configuration Helper
 * Tests database connectivity and helps with setup
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

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

async function checkDatabaseConnection() {
  loadEnvFile();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Check .env.local file');
    process.exit(1);
  }

  try {
    const url = new URL(databaseUrl);
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = parseInt(url.port || '3306', 10);
    const database = url.pathname.slice(1);

    console.log('🔍 Testing database connection...');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   User: ${user}`);
    console.log(`   Database: ${database}`);
    console.log('');

    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    console.log('✅ Successfully connected to MySQL!');
    console.log(`   Version: ${connection.connection.config.version}`);

    await connection.end();

    console.log('\n✅ Database configuration is correct.');
    console.log('\nNext steps:');
    console.log('  1. npm run db:migrate    # Create database schema');
    console.log('  2. npm run db:seed       # Load sample data');
    console.log('  3. npm run dev           # Start development server');

    process.exit(0);
  } catch (error) {
    const err = error as any;
    console.error('\n❌ Database connection failed!');
    console.error(`   Error: ${err.message}`);
    console.error('');

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔧 SOLUTION: Update MySQL credentials in .env.local');
      console.error('   Current: DATABASE_URL=mysql://root:password@localhost:3306/english_listening_db');
      console.error('');
      console.error('   Common fixes:');
      console.error('   • If MySQL has no password: DATABASE_URL=mysql://root@localhost:3306/english_listening_db');
      console.error('   • If using different user: DATABASE_URL=mysql://your_user:your_password@localhost:3306/english_listening_db');
      console.error('');
      console.error('   To find your MySQL user and password:');
      console.error('   • Check MySQL installation documentation');
      console.error('   • Run: mysql -u root (to test connection)');
    } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('🔧 SOLUTION: MySQL server is not running');
      console.error('');
      console.error('   Start MySQL:');
      console.error('   • macOS with Homebrew: brew services start mysql');
      console.error('   • macOS with Docker: docker run -p 3306:3306 mysql:8.0');
      console.error('   • Or use MAMP/XAMPP control panel');
    } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
      console.error('🔧 SOLUTION: Check if MySQL is properly configured');
    }

    console.error('\n📖 For more help, see DEPENDENCY-FIX-REPORT.md or check your .env.local file');
    process.exit(1);
  }
}

checkDatabaseConnection();

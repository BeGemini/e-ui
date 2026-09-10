import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

try {
  // Get user
  const [rows] = await connection.execute(
    'SELECT email, passwordHash FROM User WHERE email = ?',
    ['learner2@test.com']
  );

  if (rows.length === 0) {
    console.error('❌ User not found');
    process.exit(1);
  }

  const user = rows[0];
  console.log(`✅ Found user: ${user.email}`);
  console.log(`   Password Hash: ${user.passwordHash}`);

  // Test password verification
  const testPassword = 'Demo@123456';
  console.log(`\n🧪 Testing password verification...`);
  console.log(`   Input password: ${testPassword}`);

  const isMatch = await bcrypt.compare(testPassword, user.passwordHash);
  console.log(`   bcrypt.compare result: ${isMatch}`);

  if (isMatch) {
    console.log('✅ Password verification SUCCESS!');
  } else {
    console.log('❌ Password verification FAILED!');
    
    // Try to debug by manually hashing the password
    console.log('\n🔍 Debug: Manually hashing the same password...');
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log(`   New hash: ${newHash}`);
    
    const newIsMatch = await bcrypt.compare(testPassword, newHash);
    console.log(`   Comparison with new hash: ${newIsMatch}`);
  }
} catch (error) {
  console.error('❌ Error:', error);
}

await connection.end();

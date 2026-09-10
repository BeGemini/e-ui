import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

try {
  // Check users
  const [users] = await connection.execute('SELECT userId, email, passwordHash, role FROM User LIMIT 5');
  console.log('\n✅ Users in database:');
  console.table(users);

  // Check invitation codes
  const [codes] = await connection.execute('SELECT codeId, code, isUsed, expiryDate FROM InvitationCode LIMIT 5');
  console.log('\n✅ Invitation codes:');
  console.table(codes);

  console.log('\n✅ Database check complete!');
} catch (error) {
  console.error('❌ Error:', error);
}

await connection.end();

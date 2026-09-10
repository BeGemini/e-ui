import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);

try {
  // Insert a new invitation code
  await connection.execute(
    'INSERT INTO InvitationCode (codeId, code, expiryDate, isUsed) VALUES (UUID(), ?, ?, ?)',
    ['TESTCODE', futureDate, false]
  );
  
  console.log('✅ Invitation code inserted successfully!');
  console.log('Code: TESTCODE');
  console.log('Expires: ' + futureDate.toISOString());
} catch (error) {
  console.error('❌ Error inserting code:', error);
}

await connection.end();

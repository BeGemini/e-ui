import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

try {
  const [result] = await connection.execute('DESCRIBE Exercise');
  console.log('\n=== Exercise Table Schema ===');
  console.table(result);

  const [exercises] = await connection.execute('SELECT * FROM Exercise LIMIT 1');
  console.log('\n=== Exercise Data Sample ===');
  console.table(exercises);
} catch (error) {
  console.error('Error:', error.message);
}

await connection.end();

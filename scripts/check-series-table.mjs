import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

try {
  const [result] = await connection.execute('DESCRIBE Series');
  console.log('\n=== Series Table Schema ===');
  console.table(result);

  const [series] = await connection.execute('SELECT * FROM Series LIMIT 1');
  console.log('\n=== Series Data Sample ===');
  console.table(series);
} catch (error) {
  console.error('Error:', error.message);
}

await connection.end();

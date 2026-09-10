import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hhl@0048',
  database: 'english_listening_db',
});

try {
  // Test the exact query from exercises/route.ts
  let seriesQuery = 'SELECT * FROM Series';
  const seriesParams = [];
  seriesQuery += ' ORDER BY title';
  
  console.log('Query:', seriesQuery);
  console.log('Params:', seriesParams);
  
  const [series] = await connection.execute(seriesQuery, seriesParams);
  console.log('\n✅ Query successful!');
  console.log('Result count:', series.length);
  if (series.length > 0) {
    console.log('First series:', series[0]);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Full error:', error);
}

await connection.end();

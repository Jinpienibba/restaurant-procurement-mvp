import pg from 'pg';

const poolConfig = {
  user: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'restaurant_procurement',
  // No password
};

console.log('poolConfig:', JSON.stringify(poolConfig, null, 2));

const pool = new pg.Pool(poolConfig);

try {
  const result = await pool.query('SELECT NOW()');
  console.log('Database connection successful!');
  console.log('Result:', result.rows);
  process.exit(0);
} catch (error) {
  console.error('Database connection error:', error.message);
  console.error('Error code:', error.code);
  process.exit(1);
}

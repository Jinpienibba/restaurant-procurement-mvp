import pool from './src/db/index.js';

try {
  const result = await pool.query('SELECT NOW()');
  console.log('Database connection successful!');
  console.log('Result:', result.rows);
  process.exit(0);
} catch (error) {
  console.error('Database connection error:', error.message);
  process.exit(1);
}

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

console.log('Raw env values:');
console.log('DB_PASSWORD raw:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD === undefined:', process.env.DB_PASSWORD === undefined);
console.log('DB_PASSWORD === null:', process.env.DB_PASSWORD === null);
console.log('DB_PASSWORD === "":', process.env.DB_PASSWORD === '');

const password = process.env.DB_PASSWORD === undefined ? '' : process.env.DB_PASSWORD;
console.log('\nProcessed password:', password);
console.log('Processed password type:', typeof password);

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  password: password,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_procurement',
});

try {
  const result = await pool.query('SELECT NOW()');
  console.log('Database connection successful!');
  console.log('Result:', result.rows);
  process.exit(0);
} catch (error) {
  console.error('Database connection error:', error.message);
  process.exit(1);
}

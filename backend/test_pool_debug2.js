import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_procurement',
};

console.log('Before adding password:');
console.log('poolConfig:', poolConfig);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD truthy:', !!process.env.DB_PASSWORD);

// Only add password if it's provided and not empty
if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}

console.log('\nAfter adding password:');
console.log('poolConfig:', poolConfig);

const pool = new pg.Pool(poolConfig);

try {
  const result = await pool.query('SELECT NOW()');
  console.log('Database connection successful!');
  console.log('Result:', result.rows);
  process.exit(0);
} catch (error) {
  console.error('Database connection error:', error.message);
  process.exit(1);
}

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'restaurant_procurement',
};

// Only add password if it's provided and not empty
if (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim()) {
  poolConfig.password = process.env.DB_PASSWORD;
}

console.log('Final poolConfig:', JSON.stringify(poolConfig, null, 2));

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

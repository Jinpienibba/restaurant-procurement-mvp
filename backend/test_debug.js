import dotenv from 'dotenv';

dotenv.config();

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD is null:', process.env.DB_PASSWORD === null);
console.log('DB_PASSWORD is undefined:', process.env.DB_PASSWORD === undefined);

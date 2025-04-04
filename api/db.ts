import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use the environment DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Database configuration error: DATABASE_URL environment variable is not set');
  throw new Error('Database configuration error. Please check your environment variables and try again.');
}

// Create neon client
const sql = neon(connectionString);

// Create drizzle client
export const db = drizzle(sql);
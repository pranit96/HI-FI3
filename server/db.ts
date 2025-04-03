import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Database connection string is missing! Make sure DATABASE_URL is set in your .env file.');
  process.exit(1);
}

// Create connection
const sql = neon(DATABASE_URL);
export const db = drizzle(sql);

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use the provided Neon PostgreSQL connection string
const connectionString = 'postgresql://neondb_owner:npg_wTyDtal1AW9O@ep-small-recipe-a1i3jwdv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// Create neon client
const sql = neon(connectionString);

// Create drizzle client
export const db = drizzle(sql);
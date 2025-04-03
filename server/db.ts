import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";

// Use the provided Neon PostgreSQL connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_wTyDtal1AW9O@ep-small-recipe-a1i3jwdv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// Create connection
const sql = neon(DATABASE_URL);
export const db = drizzle(sql);

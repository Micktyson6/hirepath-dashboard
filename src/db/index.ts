import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
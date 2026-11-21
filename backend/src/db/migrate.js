// Auto-migration script for PayPulse AI
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paypulse_ai';
  console.log(`[Migrate] Running migrations against: ${connectionString.split('@')[1] || connectionString}`);

  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000 });

  try {
    const client = await pool.connect();
    console.log('[Migrate] Connected to PostgreSQL. Applying schema...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(sql);
    console.log('[Migrate] Schema successfully applied!');
    client.release();
  } catch (err) {
    console.warn(`[Migrate] PostgreSQL migration skipped or failed: ${err.message}`);
    console.log('[Migrate] PayPulse AI will operate with built-in ACID in-memory store.');
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export { runMigrations };

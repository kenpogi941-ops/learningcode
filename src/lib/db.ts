import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const dbPath = process.env.NODE_ENV === 'production' 
    ? path.join('/tmp', 'crm.db') 
    : path.join(process.cwd(), 'crm.db');

  console.log(`Connecting to database at: ${dbPath}`);

  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        subitem TEXT NOT NULL,
        label TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        gap TEXT NOT NULL,
        time_ok BOOLEAN NOT NULL DEFAULT 0,
        crm_ok BOOLEAN NOT NULL DEFAULT 0,
        done BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES batches (id) ON DELETE CASCADE
      );
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

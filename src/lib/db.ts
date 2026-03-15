import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { sql } from '@vercel/postgres';

let sqliteDb: SQLiteDatabase | null = null;

// Determine if we should use Postgres (Production) or SQLite (Local)
const isProd = process.env.NODE_ENV === 'production';

export async function query(command: string, params: any[] = []) {
  if (isProd) {
    // Vercel Postgres logic
    // We convert SQL syntax slightly if needed, but for these simple queries it's mostly the same
    // Note: sql tag is for tagged templates, but for dynamic queries we use the pool
    const { pool } = await import('@vercel/postgres');
    
    // Convert ? to $1, $2 for Postgres
    let pgCommand = command;
    params.forEach((_, i) => {
      pgCommand = pgCommand.replace('?', `$${i + 1}`);
    });

    // Auto-create tables if they don't exist in Postgres
    if (command.includes('INSERT') || command.includes('SELECT') || command.includes('DELETE')) {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS batches (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS checklist_items (
                id SERIAL PRIMARY KEY,
                batch_id INTEGER NOT NULL,
                subitem TEXT NOT NULL,
                label TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                gap TEXT NOT NULL,
                time_ok BOOLEAN NOT NULL DEFAULT FALSE,
                crm_ok BOOLEAN NOT NULL DEFAULT FALSE,
                done BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    return await pool.query(pgCommand, params);
  } else {
    // Local SQLite logic
    if (!sqliteDb) {
      const dbPath = path.join(process.cwd(), 'crm.db');
      sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      await sqliteDb.exec(`
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
    }

    if (command.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: await sqliteDb.all(command, params) };
    } else {
      const result = await sqliteDb.run(command, params);
      return { rows: [], lastInsertRowid: result.lastID };
    }
  }
}

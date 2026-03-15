import Database from 'better-sqlite3';
import path from 'path';

// Connect to SQLite database
// In Vercel environment, we MUST use /tmp as it is the only writable directory
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'crm.db') 
  : path.join(process.cwd(), 'crm.db');

const db = new Database(dbPath);

// Initialize tables
db.exec(`
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

export default db;

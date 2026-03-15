import path from 'path';

let sqliteDb: any = null;
let tablesInitialized = false;

// Determine if we should use Postgres (Production) or SQLite (Local)
const isProd = process.env.NODE_ENV === 'production';

export async function query(command: string, params: unknown[] = []) {
  try {
    if (isProd) {
      // Vercel Postgres logic
      if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
        console.warn("⚠️ POSTGRES_URL not found, but NODE_ENV is production. Falling back to SQLite.");
        return await localQuery(command, params);
      }

      const { db } = await import('@vercel/postgres');
      
      // Convert ? to $1, $2 for Postgres
      let pgCommand = command;
      let paramCount = 1;
      while (pgCommand.includes('?')) {
        pgCommand = pgCommand.replace('?', `$${paramCount++}`);
      }

      // Add RETURNING id to INSERT for Postgres
      if (pgCommand.trim().toUpperCase().startsWith('INSERT') && !pgCommand.toUpperCase().includes('RETURNING')) {
        pgCommand += ' RETURNING id';
      }

      if (!tablesInitialized) {
        await db.query(`
          CREATE TABLE IF NOT EXISTS batches (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.query(`
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
          )
        `);
        tablesInitialized = true;
      }

      return await db.query(pgCommand, params);
    } else {
      return await localQuery(command, params);
    }
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

async function localQuery(command: string, params: unknown[]) {
  const sqlite3 = (await import('sqlite3')).default;
  const { open } = await import('sqlite');

  if (!sqliteDb) {
    const dbPath = process.env.NODE_ENV === 'production'
      ? path.join('/tmp', 'crm.db')
      : path.join(process.cwd(), 'crm.db');

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

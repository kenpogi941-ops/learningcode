import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteDb: any = null;
let tablesInitialized = false;

// Determine if we should use Postgres (Production) or SQLite (Local)
const isProd = process.env.NODE_ENV === 'production';

export async function query(command: string, params: unknown[] = []) {
  if (isProd) {
    const { db } = await import('@vercel/postgres');
    
    // 1. Convert ? to $1, $2 for Postgres safely
    let pgCommand = command;
    let paramCount = 1;
    while (pgCommand.includes('?')) {
      pgCommand = pgCommand.replace('?', `$${paramCount++}`);
    }

    // 2. Add RETURNING id to INSERT statements for Postgres
    if (pgCommand.trim().toUpperCase().startsWith('INSERT') && !pgCommand.toUpperCase().includes('RETURNING')) {
      pgCommand += ' RETURNING id';
    }

    // 3. Ensure tables exist (Split into separate queries for Postgres stability)
    if (!tablesInitialized) {
        try {
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
        } catch (e) {
            console.error("Cloud DB Init Error:", e);
        }
    }

    // 4. Execute
    return await db.query(pgCommand, params);
  } else {
    // Local SQLite logic
    const sqlite3 = (await import('sqlite3')).default;
    const { open } = await import('sqlite');

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

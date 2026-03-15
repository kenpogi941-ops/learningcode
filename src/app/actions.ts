'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'crm-checklist-secure-2026-khent';
const AUTH_COOKIE = 'crm_auth_token';

export async function getBatches() {
  const db = await getDb();
  return db.all('SELECT * FROM batches ORDER BY created_at DESC');
}

export async function createBatch(name: string) {
  try {
    const db = await getDb();
    const result = await db.run('INSERT INTO batches (name) VALUES (?)', name);
    revalidatePath('/');
    return { success: true, id: result.lastID };
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'SQLITE_CONSTRAINT') {
      return { success: false, error: 'Batch name already exists' };
    }
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteBatch(id: number) {
  try {
    const db = await getDb();
    await db.run('DELETE FROM batches WHERE id = ?', id);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getChecklistItems(batchId: number) {
  const db = await getDb();
  return db.all('SELECT * FROM checklist_items WHERE batch_id = ? ORDER BY id ASC', batchId);
}

export async function createChecklistItem(data: {
  batch_id: number;
  subitem: string;
  label: string;
  date: string;
  time: string;
  gap: string;
}) {
  try {
    const db = await getDb();
    await db.run(`
      INSERT INTO checklist_items (batch_id, subitem, label, date, time, gap, time_ok, crm_ok, done)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    `, data.batch_id, data.subitem, data.label, data.date, data.time, data.gap);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function toggleItemState(id: number, field: 'done' | 'time_ok' | 'crm_ok', currentState: boolean) {
  try {
    const db = await getDb();
    await db.run(`UPDATE checklist_items SET ${field} = ? WHERE id = ?`, currentState ? 0 : 1, id);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteChecklistItem(id: number) {
  try {
    const db = await getDb();
    await db.run('DELETE FROM checklist_items WHERE id = ?', id);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function clearAllChecklistItems(batchId: number) {
  try {
    const db = await getDb();
    await db.run('DELETE FROM checklist_items WHERE batch_id = ?', batchId);
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function exportDatabaseBackup() {
  try {
    const db = await getDb();
    const batches = await db.all('SELECT * FROM batches');
    const items = await db.all('SELECT * FROM checklist_items');
    return { success: true, data: { batches, items } };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importDatabaseBackup(backupData: { batches: Record<string, any>[]; items: Record<string, any>[] }) {
  try {
    const db = await getDb();
    await db.run('DELETE FROM checklist_items');
    await db.run('DELETE FROM batches');

    for (const batch of backupData.batches) {
      await db.run('INSERT INTO batches (id, name, created_at) VALUES (?, ?, ?)', batch.id, batch.name, batch.created_at);
    }

    for (const item of backupData.items) {
      await db.run(`
        INSERT INTO checklist_items (id, batch_id, subitem, label, date, time, gap, time_ok, crm_ok, done, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, item.id, item.batch_id, item.subitem, item.label, item.date, item.time, item.gap,
         item.time_ok, item.crm_ok, item.done, item.created_at);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function login(password: string) {
  if (password === 'khent2003') {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    cookies().set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  }
  return { success: false, error: 'Invalid password' };
}

export async function logout() {
  cookies().delete(AUTH_COOKIE);
  revalidatePath('/');
}

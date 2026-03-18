import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// GET /api/loyalty/settings — public
export async function GET() {
  const pool = await connectToDatabase();
  const [rows] = await pool.query('SELECT `key`, `value` FROM loyalty_settings') as any;
  const settings: Record<string, string> = {};
  for (const r of rows as any[]) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

// PATCH /api/loyalty/settings — admin: update one or more settings
export async function PATCH(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const pool = await connectToDatabase();

  for (const [key, value] of Object.entries(body)) {
    await pool.query(
      'INSERT INTO loyalty_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, String(value), String(value)]
    );
  }

  return NextResponse.json({ success: true });
}

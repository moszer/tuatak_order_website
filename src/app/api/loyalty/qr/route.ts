import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';
import { randomUUID } from 'crypto';

// GET /api/loyalty/qr — admin: list QR codes
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();
  const [rows] = await pool.query(
    `SELECT id, code, points_value, label, expires_at, is_active, max_uses, used_count, createdAt
     FROM loyalty_qr_codes
     ORDER BY createdAt DESC
     LIMIT 100`
  ) as any;

  return NextResponse.json({ qrCodes: rows });
}

// POST /api/loyalty/qr — admin: generate QR code
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { points_value = 10, label, expires_hours = 24, max_uses = 0 } = await req.json();

  if (points_value < 1 || points_value > 10000) {
    return NextResponse.json({ error: 'จำนวนแต้มต้องอยู่ระหว่าง 1-10000' }, { status: 400 });
  }

  const code = randomUUID();
  const expiresAt = new Date(Date.now() + expires_hours * 3600 * 1000);

  const pool = await connectToDatabase();
  const [result] = await pool.query(
    `INSERT INTO loyalty_qr_codes (code, points_value, label, expires_at, max_uses)
     VALUES (?, ?, ?, ?, ?)`,
    [code, points_value, label || null, expiresAt, max_uses]
  ) as any;

  return NextResponse.json({
    success: true,
    qrCode: {
      id: result.insertId,
      code,
      points_value,
      label: label || null,
      expires_at: expiresAt,
      is_active: true,
      max_uses,
      used_count: 0,
    },
  });
}

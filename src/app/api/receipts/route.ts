import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// GET /api/receipts?table=1&date=2026-03-17
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const date = searchParams.get('date'); // YYYY-MM-DD

  const pool = await connectToDatabase();

  let sql = `SELECT id, tableNumber, paidAt, items, bill, foodTotal, billTotal, grandTotal,
                    qrCode, qrPoints, qrMaxUses, qrHours, createdAt
             FROM receipts WHERE 1=1`;
  const params: (string | number)[] = [];

  if (table) { sql += ' AND tableNumber = ?'; params.push(table); }
  if (date) { sql += ' AND DATE(paidAt) = ?'; params.push(date); }
  sql += ' ORDER BY paidAt DESC LIMIT 500';

  const [receipts] = await pool.query(sql, params) as any;
  return NextResponse.json({ receipts });
}

// POST /api/receipts — save a receipt after checkout
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { tableNumber, paidAt, items, bill, foodTotal, billTotal, grandTotal, qrCode, qrPoints, qrMaxUses, qrHours } = body;

  if (!tableNumber || !items) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 });
  }

  const pool = await connectToDatabase();
  const [result] = await pool.execute(
    `INSERT INTO receipts (tableNumber, paidAt, items, bill, foodTotal, billTotal, grandTotal, qrCode, qrPoints, qrMaxUses, qrHours)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tableNumber,
      paidAt ? new Date(paidAt) : new Date(),
      JSON.stringify(items),
      bill ? JSON.stringify(bill) : null,
      foodTotal || 0,
      billTotal || 0,
      grandTotal || 0,
      qrCode || null,
      qrPoints || 0,
      qrMaxUses || 0,
      qrHours || 0,
    ]
  ) as any;

  return NextResponse.json({ success: true, id: result.insertId });
}

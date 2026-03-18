import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// GET /api/loyalty/tiers — public
export async function GET() {
  const pool = await connectToDatabase();
  const [rows] = await pool.query(
    'SELECT * FROM loyalty_tiers ORDER BY sort_order ASC, min_points ASC'
  ) as any;
  const tiers = (rows as any[]).map(r => ({
    ...r,
    benefits: typeof r.benefits === 'string' ? JSON.parse(r.benefits) : r.benefits,
  }));
  return NextResponse.json({ tiers });
}

// POST /api/loyalty/tiers — admin: add tier
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier_key, tier_name, min_points, color, benefits, sort_order } = await req.json();
  if (!tier_key || !tier_name) return NextResponse.json({ error: 'tier_key and tier_name are required' }, { status: 400 });

  const pool = await connectToDatabase();
  try {
    const [result] = await pool.query(
      `INSERT INTO loyalty_tiers (tier_key, tier_name, min_points, color, benefits, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tier_key.trim().toLowerCase(), tier_name.trim(), min_points ?? 0, color ?? '#b5a99d', JSON.stringify(benefits ?? []), sort_order ?? 0]
    ) as any;
    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'tier_key นี้มีอยู่แล้ว' }, { status: 409 });
    throw err;
  }
}

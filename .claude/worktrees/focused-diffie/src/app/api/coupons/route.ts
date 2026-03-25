import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// GET /api/coupons — public: list active, non-expired coupons
// GET /api/coupons?admin=1 — admin: list all coupons
export async function GET(req: NextRequest) {
  const isAdmin = req.nextUrl.searchParams.get('admin') === '1';

  if (isAdmin && !verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();

  if (isAdmin) {
    const [rows] = await pool.query(
      `SELECT id, code, title, description, discount_type, discount_value, min_order,
              expires_at, is_active, max_uses, used_count, createdAt
       FROM coupons
       ORDER BY createdAt DESC
       LIMIT 200`
    ) as any;
    return NextResponse.json({ coupons: rows });
  }

  // Public: only active + not expired + not maxed out
  const [rows] = await pool.query(
    `SELECT id, code, title, description, discount_type, discount_value, min_order,
            expires_at, max_uses, used_count
     FROM coupons
     WHERE is_active = TRUE
       AND expires_at > NOW()
       AND (max_uses = 0 OR used_count < max_uses)
     ORDER BY createdAt DESC`
  ) as any;

  return NextResponse.json({ coupons: rows });
}

// POST /api/coupons — admin: create coupon
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, title, description, discount_type, discount_value, min_order, expires_hours, max_uses } = await req.json();

  if (!code || !title) {
    return NextResponse.json({ error: 'กรุณาระบุรหัสคูปองและชื่อ' }, { status: 400 });
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    return NextResponse.json({ error: 'ประเภทส่วนลดไม่ถูกต้อง' }, { status: 400 });
  }
  if (discount_value <= 0) {
    return NextResponse.json({ error: 'มูลค่าส่วนลดต้องมากกว่า 0' }, { status: 400 });
  }
  if (discount_type === 'percent' && discount_value > 100) {
    return NextResponse.json({ error: 'เปอร์เซ็นต์ส่วนลดต้องไม่เกิน 100' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + (expires_hours || 24) * 3600 * 1000);

  const pool = await connectToDatabase();

  try {
    const [result] = await pool.query(
      `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, expires_at, max_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        title.trim(),
        description?.trim() || null,
        discount_type,
        discount_value,
        min_order || 0,
        expiresAt,
        max_uses || 0,
      ]
    ) as any;

    return NextResponse.json({
      success: true,
      coupon: {
        id: result.insertId,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description?.trim() || null,
        discount_type,
        discount_value,
        min_order: min_order || 0,
        expires_at: expiresAt,
        is_active: true,
        max_uses: max_uses || 0,
        used_count: 0,
      },
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'รหัสคูปองนี้มีอยู่แล้ว' }, { status: 409 });
    }
    throw err;
  }
}

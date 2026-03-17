import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';
import { getMemberFromCookie } from '@/lib/memberJwt';

// GET /api/coupons          — public list (active, not expired, not maxed)
// GET /api/coupons?admin=1  — admin: all coupons
export async function GET(req: NextRequest) {
  const isAdmin = req.nextUrl.searchParams.get('admin') === '1';

  if (isAdmin && !verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();

  if (isAdmin) {
    const [rows] = await pool.query(
      `SELECT id, code, title, description, discount_type, discount_value, min_order,
              points_cost, expires_at, is_active, max_uses, used_count, createdAt
       FROM coupons
       ORDER BY createdAt DESC
       LIMIT 200`
    ) as any;
    return NextResponse.json({ coupons: rows });
  }

  // Public: active + not expired + not maxed
  const member = await getMemberFromCookie();

  const [rows] = await pool.query(
    `SELECT id, title, description, discount_type, discount_value, min_order,
            points_cost, expires_at, max_uses, used_count
     FROM coupons
     WHERE is_active = TRUE
       AND expires_at > NOW()
       AND (max_uses = 0 OR used_count < max_uses)
     ORDER BY points_cost ASC, createdAt DESC`
  ) as any;

  if (!member) {
    return NextResponse.json({ coupons: rows });
  }

  // Attach claimed info + code for logged-in member
  const couponIds = (rows as any[]).map((r: any) => r.id);
  let claimedMap: Record<number, boolean> = {};

  if (couponIds.length > 0) {
    const placeholders = couponIds.map(() => '?').join(',');
    const [claimed] = await pool.query(
      `SELECT coupon_id FROM member_coupons WHERE member_id = ? AND coupon_id IN (${placeholders})`,
      [member.memberId, ...couponIds]
    ) as any;
    for (const row of claimed as any[]) {
      claimedMap[row.coupon_id] = true;
    }
  }

  // For claimed coupons, also return the code
  const claimedIds = Object.keys(claimedMap).map(Number);
  let codeMap: Record<number, string> = {};
  if (claimedIds.length > 0) {
    const placeholders = claimedIds.map(() => '?').join(',');
    const [codes] = await pool.query(
      `SELECT id, code FROM coupons WHERE id IN (${placeholders})`,
      claimedIds
    ) as any;
    for (const row of codes as any[]) {
      codeMap[row.id] = row.code;
    }
  }

  const enriched = (rows as any[]).map((c: any) => ({
    ...c,
    claimed: !!claimedMap[c.id],
    code: claimedMap[c.id] ? codeMap[c.id] : undefined,
  }));

  return NextResponse.json({ coupons: enriched });
}

// POST /api/coupons — admin: create coupon
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, title, description, discount_type, discount_value, min_order, points_cost, expires_hours, max_uses } = await req.json();

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
      `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, points_cost, expires_at, max_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        title.trim(),
        description?.trim() || null,
        discount_type,
        discount_value,
        min_order || 0,
        points_cost || 0,
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
        points_cost: points_cost || 0,
      },
    });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'รหัสคูปองนี้มีอยู่แล้ว' }, { status: 409 });
    }
    throw err;
  }
}

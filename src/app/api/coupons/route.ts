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
              points_cost, expires_at, is_active, max_uses, used_count, per_member_uses, createdAt
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
            points_cost, expires_at, max_uses, used_count, per_member_uses
     FROM coupons
     WHERE is_active = TRUE
       AND expires_at > NOW()
       AND (max_uses = 0 OR used_count < max_uses)
     ORDER BY points_cost ASC, createdAt DESC`
  ) as any;

  if (!member) {
    return NextResponse.json({ coupons: rows });
  }

  // Attach claimed_count per coupon for this member
  const couponIds = (rows as any[]).map((r: any) => r.id);
  let claimedCountMap: Record<number, number> = {};

  if (couponIds.length > 0) {
    const placeholders = couponIds.map(() => '?').join(',');
    const [claimed] = await pool.query(
      `SELECT coupon_id, COUNT(*) as cnt FROM member_coupons WHERE member_id = ? AND coupon_id IN (${placeholders}) GROUP BY coupon_id`,
      [member.memberId, ...couponIds]
    ) as any;
    for (const row of claimed as any[]) {
      claimedCountMap[row.coupon_id] = Number(row.cnt);
    }
  }

  const enriched = (rows as any[]).map((c: any) => ({
    ...c,
    claimed_count: claimedCountMap[c.id] || 0,
    // can_redeem_more: per_member_uses=0 means unlimited, else check count < limit
    claimed: (claimedCountMap[c.id] || 0) > 0 && (c.per_member_uses > 0 && (claimedCountMap[c.id] || 0) >= c.per_member_uses),
  }));

  return NextResponse.json({ coupons: enriched });
}

// POST /api/coupons — admin: create coupon
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code, title, description, discount_type, discount_value, min_order, points_cost, expires_hours, max_uses, per_member_uses } = await req.json();

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
      `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, points_cost, expires_at, max_uses, per_member_uses)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        per_member_uses || 1,
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

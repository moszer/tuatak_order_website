import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';

// GET /api/coupons/mine — member: get all claimed coupons (expired/used included)
export async function GET(_req: NextRequest) {
  const member = await getMemberFromCookie();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();

  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.title, c.description, c.discount_type, c.discount_value,
            c.min_order, c.points_cost, c.expires_at, c.max_uses, c.used_count,
            mc.claimed_at, mc.points_spent
     FROM member_coupons mc
     JOIN coupons c ON mc.coupon_id = c.id
     WHERE mc.member_id = ?
     ORDER BY mc.claimed_at DESC`,
    [member.memberId]
  ) as any;

  return NextResponse.json({ coupons: rows });
}

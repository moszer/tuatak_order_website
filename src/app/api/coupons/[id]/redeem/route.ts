import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';

// POST /api/coupons/[id]/redeem — member: spend points to claim coupon
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getMemberFromCookie();
  if (!member) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบสมาชิกก่อน' }, { status: 401 });
  }

  const { id: rawId } = await params;
  const couponId = parseInt(rawId);
  if (isNaN(couponId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const pool = await connectToDatabase();

  // Get coupon
  const [coupons] = await pool.query(
    `SELECT id, code, title, points_cost, expires_at, is_active, max_uses, used_count, per_member_uses
     FROM coupons WHERE id = ?`,
    [couponId]
  ) as any;

  if ((coupons as any[]).length === 0) {
    return NextResponse.json({ error: 'ไม่พบคูปองนี้' }, { status: 404 });
  }

  const coupon = (coupons as any[])[0];

  if (!coupon.is_active) {
    return NextResponse.json({ error: 'คูปองนี้ถูกปิดใช้งาน' }, { status: 400 });
  }
  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'คูปองนี้หมดอายุแล้ว' }, { status: 400 });
  }
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: 'คูปองนี้ถูกแลกครบแล้ว' }, { status: 400 });
  }

  // Check per-member usage limit
  const perLimit = coupon.per_member_uses || 1;
  const [existing] = await pool.query(
    'SELECT COUNT(*) as cnt FROM member_coupons WHERE member_id = ? AND coupon_id = ?',
    [member.memberId, couponId]
  ) as any;
  const existingCount = Number((existing as any[])[0].cnt);
  if (perLimit > 0 && existingCount >= perLimit) {
    const limitMsg = perLimit === 1 ? 'คุณแลกคูปองนี้ไปแล้ว' : `คุณแลกคูปองนี้ครบ ${perLimit} ครั้งแล้ว`;
    return NextResponse.json({ error: limitMsg, code: coupon.code }, { status: 409 });
  }

  // Get member's current points
  const [members] = await pool.query(
    'SELECT id, points FROM members WHERE id = ?',
    [member.memberId]
  ) as any;
  if ((members as any[]).length === 0) {
    return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });
  }

  const memberData = (members as any[])[0];
  if (memberData.points < coupon.points_cost) {
    return NextResponse.json({
      error: `แต้มไม่เพียงพอ (มี ${memberData.points} แต้ม ต้องการ ${coupon.points_cost} แต้ม)`,
    }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Deduct points
    await conn.query(
      'UPDATE members SET points = points - ? WHERE id = ?',
      [coupon.points_cost, member.memberId]
    );

    // Record points history
    if (coupon.points_cost > 0) {
      await conn.query(
        `INSERT INTO points_history (member_id, points, type, description)
         VALUES (?, ?, 'redeem', ?)`,
        [member.memberId, -coupon.points_cost, `แลกคูปอง: ${coupon.title}`]
      );
    }

    // Increment coupon used_count
    await conn.query(
      'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
      [couponId]
    );

    // Record claim
    await conn.query(
      'INSERT INTO member_coupons (member_id, coupon_id, points_spent) VALUES (?, ?, ?)',
      [member.memberId, couponId, coupon.points_cost]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // Return updated points + coupon code
  const [updated] = await pool.query('SELECT points FROM members WHERE id = ?', [member.memberId]) as any;

  return NextResponse.json({
    success: true,
    code: coupon.code,
    pointsSpent: coupon.points_cost,
    newPoints: (updated as any[])[0].points,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// POST /api/coupons/use — admin: mark a coupon as used by QR token
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { qrToken } = await req.json();
  if (!qrToken) return NextResponse.json({ error: 'ไม่พบ QR token' }, { status: 400 });

  const pool = await connectToDatabase();

  const [rows] = await pool.query(
    `SELECT mc.id, mc.is_used, mc.member_id, mc.coupon_id,
            m.name AS member_name, m.phone AS member_phone,
            c.title AS coupon_title, c.discount_type, c.discount_value, c.expires_at
     FROM member_coupons mc
     JOIN members m ON mc.member_id = m.id
     JOIN coupons c ON mc.coupon_id = c.id
     WHERE mc.qr_token = ?`,
    [qrToken]
  ) as any;

  if (!(rows as any[]).length) return NextResponse.json({ error: 'ไม่พบคูปองนี้ หรือ QR ไม่ถูกต้อง' }, { status: 404 });

  const mc = (rows as any[])[0];

  if (mc.is_used) return NextResponse.json({ error: 'คูปองนี้ถูกใช้ไปแล้ว' }, { status: 400 });
  if (new Date(mc.expires_at) < new Date()) return NextResponse.json({ error: 'คูปองหมดอายุแล้ว' }, { status: 400 });

  await pool.query('UPDATE member_coupons SET is_used = 1, used_at = NOW() WHERE id = ?', [mc.id]);

  return NextResponse.json({
    success: true,
    memberName: mc.member_name,
    memberPhone: mc.member_phone,
    couponTitle: mc.coupon_title,
    discountType: mc.discount_type,
    discountValue: mc.discount_value,
  });
}

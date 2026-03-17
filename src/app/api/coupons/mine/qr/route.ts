import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';
import crypto from 'crypto';

// GET /api/coupons/mine/qr?couponId=X — generate/return QR token for a claimed coupon
export async function GET(req: NextRequest) {
  const member = await getMemberFromCookie();
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const couponId = parseInt(req.nextUrl.searchParams.get('couponId') || '');
  if (isNaN(couponId)) return NextResponse.json({ error: 'Invalid couponId' }, { status: 400 });

  const pool = await connectToDatabase();

  // Find the member_coupon
  const [rows] = await pool.query(
    'SELECT id, is_used, qr_token FROM member_coupons WHERE member_id = ? AND coupon_id = ?',
    [member.memberId, couponId]
  ) as any;

  if (!(rows as any[]).length) return NextResponse.json({ error: 'ไม่พบคูปองนี้ในบัญชีของคุณ' }, { status: 404 });

  const mc = (rows as any[])[0];
  if (mc.is_used) return NextResponse.json({ error: 'คูปองนี้ถูกใช้ไปแล้ว' }, { status: 400 });

  // Generate qr_token if not exists
  let token = mc.qr_token;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    await pool.query('UPDATE member_coupons SET qr_token = ? WHERE id = ?', [token, mc.id]);
  }

  return NextResponse.json({ qrToken: token });
}

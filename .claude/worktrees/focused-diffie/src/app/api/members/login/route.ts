import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { signMemberToken, setMemberCookieHeader } from '@/lib/memberJwt';

// POST /api/members/login — login with phone number
export async function POST(req: NextRequest) {
  const { phone } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: 'กรุณากรอกเบอร์โทร' }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const pool = await connectToDatabase();

  const [rows] = await pool.query(
    'SELECT id, phone, name, points, tier FROM members WHERE phone = ?',
    [cleanPhone]
  ) as any;

  if ((rows as any[]).length === 0) {
    return NextResponse.json({ error: 'ไม่พบเบอร์โทรนี้ในระบบ กรุณาสมัครสมาชิกก่อน' }, { status: 404 });
  }

  const member = rows[0];
  const token = signMemberToken({ memberId: member.id, phone: member.phone, name: member.name });

  const res = NextResponse.json({
    success: true,
    memberId: member.id,
    name: member.name,
    phone: member.phone,
    points: member.points,
    tier: member.tier,
  });
  res.headers.set('Set-Cookie', setMemberCookieHeader(token));
  return res;
}

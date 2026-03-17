import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { signMemberToken, setMemberCookieHeader } from '@/lib/memberJwt';
import { verifyAuth } from '@/lib/auth';

// POST /api/members — register new member
export async function POST(req: NextRequest) {
  const { phone, name, email } = await req.json();

  if (!phone || !name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อและเบอร์โทร' }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 9 || cleanPhone.length > 10) {
    return NextResponse.json({ error: 'เบอร์โทรไม่ถูกต้อง' }, { status: 400 });
  }

  const pool = await connectToDatabase();

  const [existing] = await pool.query('SELECT id FROM members WHERE phone = ?', [cleanPhone]) as any;
  if ((existing as any[]).length > 0) {
    return NextResponse.json({ error: 'เบอร์โทรนี้ถูกใช้งานแล้ว' }, { status: 409 });
  }

  const [result] = await pool.query(
    'INSERT INTO members (phone, name, email) VALUES (?, ?, ?)',
    [cleanPhone, name.trim(), email?.trim() || null]
  ) as any;

  const memberId = result.insertId;
  const token = signMemberToken({ memberId, phone: cleanPhone, name: name.trim() });

  const res = NextResponse.json({ success: true, memberId, name: name.trim(), phone: cleanPhone, points: 0, tier: 'bronze' });
  res.headers.set('Set-Cookie', setMemberCookieHeader(token));
  return res;
}

// GET /api/members — admin: list all members
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();
  const [members] = await pool.query(
    'SELECT id, phone, name, email, points, tier, memberNumber, validTill, totalVisits, address, gender, lineUid, linePictureUrl, createdAt FROM members ORDER BY points DESC'
  ) as any;

  return NextResponse.json({ members });
}

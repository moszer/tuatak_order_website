import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';

// PATCH /api/members/profile — member: complete/update profile (phone, address, gender)
export async function PATCH(req: NextRequest) {
  const member = await getMemberFromCookie();
  if (!member) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const body = await req.json();
  const { phone, address, gender } = body;

  if (!address?.trim() || !gender) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 });
  }
  if (!['male', 'female', 'other'].includes(gender)) {
    return NextResponse.json({ error: 'เพศไม่ถูกต้อง' }, { status: 400 });
  }

  const pool = await connectToDatabase();

  const fields: string[] = ['address = ?', 'gender = ?'];
  const values: any[] = [address.trim(), gender];

  if (phone?.trim()) {
    // Check phone uniqueness (skip if same as current)
    const [existing] = await pool.query(
      'SELECT id FROM members WHERE phone = ? AND id != ?',
      [phone.trim(), member.memberId]
    ) as any;
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'เบอร์โทรนี้ถูกใช้แล้ว' }, { status: 409 });
    }
    fields.push('phone = ?');
    values.push(phone.trim());
  }

  values.push(member.memberId);
  await pool.query(
    `UPDATE members SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const [rows] = await pool.query(
    'SELECT id, phone, name, email, points, tier, memberNumber, validTill, lineUid, linePictureUrl, totalVisits, address, gender, createdAt FROM members WHERE id = ?',
    [member.memberId]
  ) as any;

  return NextResponse.json({ success: true, member: (rows as any[])[0] });
}

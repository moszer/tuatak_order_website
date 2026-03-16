import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie, clearMemberCookieHeader } from '@/lib/memberJwt';

// GET /api/members/me — get current member profile + points history
export async function GET(_req: NextRequest) {
  const member = await getMemberFromCookie();
  if (!member) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await connectToDatabase();

  const [rows] = await pool.query(
    'SELECT id, phone, name, email, points, tier, memberNumber, validTill, lineUid, linePictureUrl, totalVisits, createdAt FROM members WHERE id = ?',
    [member.memberId]
  ) as any;

  if ((rows as any[]).length === 0) {
    const res = NextResponse.json({ error: 'Member not found' }, { status: 404 });
    res.headers.set('Set-Cookie', clearMemberCookieHeader());
    return res;
  }

  const [history] = await pool.query(
    `SELECT ph.id, ph.points, ph.type, ph.description, ph.createdAt,
            qr.label as qr_label
     FROM points_history ph
     LEFT JOIN loyalty_qr_codes qr ON ph.qr_code_id = qr.id
     WHERE ph.member_id = ?
     ORDER BY ph.createdAt DESC
     LIMIT 50`,
    [member.memberId]
  ) as any;

  return NextResponse.json({ member: rows[0], history });
}

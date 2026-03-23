import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';

// POST /api/loyalty/scan — customer scans QR code to earn points
export async function POST(req: NextRequest) {
  const memberPayload = await getMemberFromCookie();
  if (!memberPayload) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนสแกน QR', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: 'ไม่พบรหัส QR' }, { status: 400 });
  }

  const pool = await connectToDatabase();

  // Find the QR code
  const [qrRows] = await pool.query(
    'SELECT * FROM loyalty_qr_codes WHERE code = ?',
    [code]
  ) as any;

  if ((qrRows as any[]).length === 0) {
    return NextResponse.json({ error: 'QR Code ไม่ถูกต้อง' }, { status: 404 });
  }

  const qr = qrRows[0];

  if (!qr.is_active) {
    return NextResponse.json({ error: 'QR Code นี้ถูกปิดการใช้งานแล้ว' }, { status: 400 });
  }

  if (new Date(qr.expires_at) < new Date()) {
    return NextResponse.json({ error: 'QR Code หมดอายุแล้ว' }, { status: 400 });
  }

  if (qr.max_uses > 0 && qr.used_count >= qr.max_uses) {
    return NextResponse.json({ error: 'QR Code ถูกใช้งานครบแล้ว' }, { status: 400 });
  }

  // Check if this member already scanned this QR
  const [scanCheck] = await pool.query(
    'SELECT id FROM qr_scans WHERE member_id = ? AND qr_code_id = ?',
    [memberPayload.memberId, qr.id]
  ) as any;

  if ((scanCheck as any[]).length > 0) {
    return NextResponse.json({ error: 'คุณได้สแกน QR Code นี้ไปแล้ว' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Record the scan
    await conn.query(
      'INSERT INTO qr_scans (qr_code_id, member_id, points_earned) VALUES (?, ?, ?)',
      [qr.id, memberPayload.memberId, qr.points_value]
    );

    // Update QR used_count
    await conn.query(
      'UPDATE loyalty_qr_codes SET used_count = used_count + 1 WHERE id = ?',
      [qr.id]
    );

    // Add points to member
    await conn.query(
      'UPDATE members SET points = points + ? WHERE id = ?',
      [qr.points_value, memberPayload.memberId]
    );

    // Update tier based on new total
    const [memberRows] = await conn.query('SELECT points FROM members WHERE id = ?', [memberPayload.memberId]) as any;
    const newPoints = memberRows[0].points;
    // Use configured tiers from DB (same data the admin panel manages)
    const [tierRows] = await conn.query('SELECT tier_key, min_points FROM loyalty_tiers ORDER BY min_points DESC') as any;
    let newTier = 'member';
    if ((tierRows as any[]).length > 0) {
      const matched = (tierRows as any[]).find((t: any) => newPoints >= t.min_points);
      newTier = matched ? matched.tier_key : (tierRows as any[])[(tierRows as any[]).length - 1].tier_key;
    } else {
      newTier = newPoints >= 5000 ? 'gold' : newPoints >= 1000 ? 'silver' : 'member';
    }
    await conn.query('UPDATE members SET tier = ? WHERE id = ?', [newTier, memberPayload.memberId]);

    // Record in points_history
    await conn.query(
      `INSERT INTO points_history (member_id, points, type, description, qr_code_id)
       VALUES (?, ?, 'earn', ?, ?)`,
      [memberPayload.memberId, qr.points_value, qr.label || `สแกน QR Code +${qr.points_value} แต้ม`, qr.id]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      points_earned: qr.points_value,
      new_total: newPoints,
      new_tier: newTier,
      label: qr.label,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

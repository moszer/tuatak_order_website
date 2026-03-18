import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { getMemberFromCookie } from '@/lib/memberJwt';
import { randomUUID } from 'crypto';

// POST /api/loyalty/scan — customer scans QR code to earn stamps
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

  // Load loyalty settings
  const [settingRows] = await pool.query('SELECT `key`, `value` FROM loyalty_settings').catch(() => [[]] as any) as any;
  const settings: Record<string, string> = {};
  for (const r of settingRows as any[]) settings[r.key] = r.value;
  const stampGoal = parseInt(settings['stamp_goal'] || '15');
  const rewardTitle = settings['stamp_reward_title'] || 'ฟรี! บุฟเฟ่ต์ 1 ที่';
  const rewardDesc = settings['stamp_reward_description'] || 'รางวัลจากการสะสมแสตมป์ครบ';
  const rewardExpiresHours = parseInt(settings['stamp_reward_expires_hours'] || '720');

  // Load loyalty tiers to compute new tier
  const [tierRows] = await pool.query('SELECT tier_key, min_points FROM loyalty_tiers ORDER BY min_points DESC').catch(() => [[]] as any) as any;

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

    // Add points to member AND increment totalVisits by 1
    await conn.query(
      'UPDATE members SET points = points + ?, totalVisits = totalVisits + 1 WHERE id = ?',
      [qr.points_value, memberPayload.memberId]
    );

    // Fetch updated member
    const [memberRows] = await conn.query(
      'SELECT points, totalVisits FROM members WHERE id = ?',
      [memberPayload.memberId]
    ) as any;
    const newPoints = memberRows[0].points;
    const newVisits = memberRows[0].totalVisits;

    // Compute tier from totalVisits using loyalty_tiers.min_points as visit thresholds
    let newTier = 'member';
    for (const t of tierRows as any[]) {
      if (newVisits >= t.min_points) { newTier = t.tier_key; break; }
    }
    await conn.query('UPDATE members SET tier = ? WHERE id = ?', [newTier, memberPayload.memberId]);

    // Record in points_history
    await conn.query(
      `INSERT INTO points_history (member_id, points, type, description, qr_code_id)
       VALUES (?, ?, 'earn', ?, ?)`,
      [memberPayload.memberId, qr.points_value, qr.label || `สแกน QR Code +${qr.points_value} แต้ม`, qr.id]
    );

    // Check if stamp card is complete (totalVisits is a multiple of stampGoal)
    let stampCardComplete = false;
    let rewardCouponCode: string | null = null;
    if (newVisits > 0 && newVisits % stampGoal === 0) {
      stampCardComplete = true;
      // Auto-create a free meal coupon for the member
      rewardCouponCode = randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
      const expiresAt = new Date(Date.now() + rewardExpiresHours * 3600 * 1000);
      const [couponResult] = await conn.query(
        `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, points_cost, expires_at, is_active, max_uses, per_member_uses)
         VALUES (?, ?, ?, 'fixed', 0, 0, 0, ?, 1, 1, 1)`,
        [
          rewardCouponCode,
          rewardTitle,
          `${rewardDesc} (ครั้งที่ ${newVisits / stampGoal})`,
          expiresAt,
        ]
      ) as any;
      // Auto-claim coupon for this member
      await conn.query(
        `INSERT INTO member_coupons (member_id, coupon_id, points_spent) VALUES (?, ?, 0)`,
        [memberPayload.memberId, couponResult.insertId]
      );
    }

    const currentStamps = newVisits % stampGoal;

    await conn.commit();

    return NextResponse.json({
      success: true,
      points_earned: qr.points_value,
      new_total: newPoints,
      new_tier: newTier,
      new_visits: newVisits,
      current_stamps: currentStamps,
      stamp_goal: stampGoal,
      stamp_card_complete: stampCardComplete,
      reward_coupon_code: rewardCouponCode,
      label: qr.label,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

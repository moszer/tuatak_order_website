import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// DELETE /api/members/[id] — admin: delete a member and all related data
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
  }

  const pool = await connectToDatabase();

  const [rows] = await pool.query('SELECT id FROM members WHERE id = ?', [memberId]) as any;
  if ((rows as any[]).length === 0) {
    return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM points_history WHERE member_id = ?', [memberId]);
    await conn.query('DELETE FROM qr_scans WHERE member_id = ?', [memberId]);
    await conn.query('DELETE FROM members WHERE id = ?', [memberId]);
    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

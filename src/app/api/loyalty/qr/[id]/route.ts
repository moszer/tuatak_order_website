import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// PATCH /api/loyalty/qr/[id] — toggle active / deactivate
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { is_active } = await req.json();

  const pool = await connectToDatabase();
  await pool.query('UPDATE loyalty_qr_codes SET is_active = ? WHERE id = ?', [is_active, id]);

  return NextResponse.json({ success: true });
}

// DELETE /api/loyalty/qr/[id] — delete QR code
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const pool = await connectToDatabase();
  await pool.query('DELETE FROM loyalty_qr_codes WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}

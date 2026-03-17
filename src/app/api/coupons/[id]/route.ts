import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// PATCH /api/coupons/[id] — admin: update coupon (toggle active, edit fields)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const pool = await connectToDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title.trim()); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description?.trim() || null); }
  if (body.discount_value !== undefined) { fields.push('discount_value = ?'); values.push(body.discount_value); }
  if (body.min_order !== undefined) { fields.push('min_order = ?'); values.push(body.min_order); }
  if (body.max_uses !== undefined) { fields.push('max_uses = ?'); values.push(body.max_uses); }
  if (body.points_cost !== undefined) { fields.push('points_cost = ?'); values.push(body.points_cost); }

  if (fields.length === 0) return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });

  values.push(id);
  await pool.query(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);

  return NextResponse.json({ success: true });
}

// DELETE /api/coupons/[id] — admin: delete coupon
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const pool = await connectToDatabase();
  await pool.query('DELETE FROM coupons WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}

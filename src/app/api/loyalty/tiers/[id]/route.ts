import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { verifyAuth } from '@/lib/auth';

// PATCH /api/loyalty/tiers/[id] — admin: update tier
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const pool = await connectToDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (body.tier_name !== undefined)  { fields.push('tier_name = ?');  values.push(body.tier_name.trim()); }
  if (body.min_points !== undefined) { fields.push('min_points = ?'); values.push(Number(body.min_points)); }
  if (body.color !== undefined)      { fields.push('color = ?');      values.push(body.color); }
  if (body.benefits !== undefined)   { fields.push('benefits = ?');   values.push(JSON.stringify(body.benefits)); }
  if (body.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(Number(body.sort_order)); }

  if (fields.length === 0) return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });

  values.push(id);
  await pool.query(`UPDATE loyalty_tiers SET ${fields.join(', ')} WHERE id = ?`, values);
  return NextResponse.json({ success: true });
}

// DELETE /api/loyalty/tiers/[id] — admin: delete tier
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const pool = await connectToDatabase();
  await pool.query('DELETE FROM loyalty_tiers WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}

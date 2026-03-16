import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

function calculateTier(totalVisits: number): 'member' | 'silver' | 'gold' | 'platinum' {
  if (totalVisits >= 150) return 'platinum';
  if (totalVisits >= 100) return 'gold';
  if (totalVisits >= 60) return 'silver';
  return 'member';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, points, type, description, tableNumber } = body;

    if (!memberId || points === undefined || !type) {
      return NextResponse.json({ error: 'memberId, points, and type are required' }, { status: 400 });
    }

    if (type !== 'earn' && type !== 'redeem') {
      return NextResponse.json({ error: 'type must be earn or redeem' }, { status: 400 });
    }

    const pool = await connectToDatabase();

    // Get current member
    const [members] = await pool.query(
      'SELECT * FROM members WHERE id = ?',
      [memberId]
    ) as any[];

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = members[0];

    // Insert points history record
    await pool.query(
      `INSERT INTO member_points_history (memberId, points, type, description, tableNumber) VALUES (?, ?, ?, ?, ?)`,
      [memberId, points, type, description || null, tableNumber || null]
    );

    // Calculate new points and visits
    const newPoints = type === 'earn'
      ? member.points + points
      : Math.max(0, member.points - points);

    const newTotalVisits = type === 'earn' ? member.totalVisits + 1 : member.totalVisits;
    const newTier = calculateTier(newTotalVisits);

    // Update member
    await pool.query(
      `UPDATE members SET points = ?, totalVisits = ?, tier = ? WHERE id = ?`,
      [newPoints, newTotalVisits, newTier, memberId]
    );

    // Return updated member
    const [updatedMembers] = await pool.query(
      'SELECT * FROM members WHERE id = ?',
      [memberId]
    ) as any[];

    return NextResponse.json({ member: updatedMembers[0] });
  } catch (error) {
    console.error('POST /api/member/points error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

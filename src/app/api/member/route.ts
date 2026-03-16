import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

function generateMemberNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `TN${yyyy}${MM}${dd}${HH}${mm}${random}`;
}

function getValidTill(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, email, lineUid, linePictureUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!phone && !lineUid) {
      return NextResponse.json({ error: 'phone or lineUid is required' }, { status: 400 });
    }

    const pool = await connectToDatabase();

    // Check if member already exists by phone or lineUid
    let existing: any[] = [];
    if (phone) {
      const [rows] = await pool.query('SELECT * FROM members WHERE phone = ?', [phone]) as any[];
      existing = rows || [];
    }
    if (existing.length === 0 && lineUid) {
      const [rows] = await pool.query('SELECT * FROM members WHERE lineUid = ?', [lineUid]) as any[];
      existing = rows || [];
    }

    if (existing.length > 0) {
      // Link LINE account to existing member if not yet linked
      const member = existing[0];
      if (lineUid && !member.lineUid) {
        await pool.query(
          'UPDATE members SET lineUid = ?, linePictureUrl = ?, updatedAt = NOW() WHERE id = ?',
          [lineUid, linePictureUrl || null, member.id]
        );
        member.lineUid = lineUid;
        member.linePictureUrl = linePictureUrl || member.linePictureUrl;
      }
      return NextResponse.json({ member });
    }

    // Create new member
    const memberNumber = generateMemberNumber();
    const validTill = getValidTill();

    await pool.query(
      `INSERT INTO members (phone, name, email, memberNumber, validTill, lineUid, linePictureUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [phone || null, name, email || null, memberNumber, validTill, lineUid || null, linePictureUrl || null]
    );

    const lookupField = phone ? 'phone' : 'lineUid';
    const lookupValue = phone || lineUid;
    const [newMember] = await pool.query(
      `SELECT * FROM members WHERE ${lookupField} = ?`,
      [lookupValue]
    ) as any[];

    return NextResponse.json({ member: newMember[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const lineUid = searchParams.get('lineUid');

    if (!phone && !lineUid) {
      return NextResponse.json({ error: 'phone or lineUid query param is required' }, { status: 400 });
    }

    const pool = await connectToDatabase();

    const field = phone ? 'phone' : 'lineUid';
    const value = phone || lineUid;
    const [members] = await pool.query(
      `SELECT * FROM members WHERE ${field} = ?`,
      [value]
    ) as any[];

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = members[0];

    const [history] = await pool.query(
      'SELECT * FROM member_points_history WHERE memberId = ? ORDER BY createdAt DESC LIMIT 20',
      [member.id]
    ) as any[];

    return NextResponse.json({ member, history: history || [] });
  } catch (error) {
    console.error('GET /api/member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

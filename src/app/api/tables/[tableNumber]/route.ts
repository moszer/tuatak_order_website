import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> }
) {
  try {
    const { tableNumber } = await params;

    if (!tableNumber) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Check if there's an active session for this table
    const [existingSessions] = await pool.execute(
      'SELECT * FROM table_sessions WHERE tableNumber = ? AND status = "active" ORDER BY startedAt DESC LIMIT 1',
      [tableNumber]
    ) as any;

    if (existingSessions.length > 0) {
      // Return existing active session
      return NextResponse.json({
        success: true,
        session: {
          id: existingSessions[0].id,
          tableNumber: existingSessions[0].tableNumber,
          status: existingSessions[0].status,
          startedAt: existingSessions[0].startedAt,
        },
        isNew: false,
      });
    }

    // Create new session
    const [result] = await pool.execute(
      'INSERT INTO table_sessions (tableNumber, status) VALUES (?, "active")',
      [tableNumber]
    ) as any;

    return NextResponse.json({
      success: true,
      session: {
        id: result.insertId,
        tableNumber,
        status: 'active',
        startedAt: new Date(),
      },
      isNew: true,
    });
  } catch (error) {
    console.error('Error starting table session:', error);
    return NextResponse.json(
      { error: 'Failed to start table session' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> }
) {
  try {
    const { tableNumber } = await params;

    const pool = await connectToDatabase();

    const [sessions] = await pool.execute(
      'SELECT * FROM table_sessions WHERE tableNumber = ? AND status = "active" ORDER BY startedAt DESC LIMIT 1',
      [tableNumber]
    ) as any;

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        session: null,
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessions[0].id,
        tableNumber: sessions[0].tableNumber,
        status: sessions[0].status,
        startedAt: sessions[0].startedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching table session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table session' },
      { status: 500 }
    );
  }
}


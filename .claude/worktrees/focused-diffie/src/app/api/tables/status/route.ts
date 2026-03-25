import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableNumber = searchParams.get('table');

    const pool = await connectToDatabase();

    if (tableNumber) {
      // Get specific table status
      const [rows] = await pool.execute(
        'SELECT * FROM table_status WHERE tableNumber = ?',
        [tableNumber]
      ) as any;

      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          tableNumber,
          isReady: false,
        });
      }

      return NextResponse.json({
        success: true,
        tableNumber: rows[0].tableNumber,
        isReady: Boolean(rows[0].isReady),
      });
    } else {
      // Get all table statuses
      const [rows] = await pool.execute(
        'SELECT * FROM table_status ORDER BY tableNumber ASC'
      ) as any;

      const tables = rows.map((row: any) => ({
        tableNumber: row.tableNumber,
        isReady: Boolean(row.isReady),
        updatedAt: row.updatedAt,
      }));

      return NextResponse.json({
        success: true,
        tables,
      });
    }
  } catch (error) {
    console.error('Error fetching table status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableNumber, isReady } = body;

    if (!tableNumber || typeof isReady !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: tableNumber, isReady' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Insert or update table status
    await pool.execute(
      `INSERT INTO table_status (tableNumber, isReady) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE isReady = ?, updatedAt = NOW()`,
      [tableNumber, isReady, isReady]
    );

    return NextResponse.json({
      success: true,
      message: 'Table status updated successfully',
    });
  } catch (error) {
    console.error('Error updating table status:', error);
    return NextResponse.json(
      { error: 'Failed to update table status' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableNumber, adultCount, child120Count, child100Count, drinkRefillCount, customTotalPrice } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      );
    }

    const adultPrice = 199.00;
    const child120Price = 130.00;
    const drinkRefillPrice = 39.00;

    // Calculate total price
    let totalPrice: number;
    if (typeof customTotalPrice === 'number' && !Number.isNaN(customTotalPrice) && customTotalPrice >= 0) {
      // Use manually entered total when provided
      totalPrice = customTotalPrice;
    } else {
      totalPrice = 
        (adultCount * adultPrice) +
        (child120Count * child120Price) +
        (child100Count * 0) + // Free
        (drinkRefillCount * drinkRefillPrice);
    }

    const pool = await connectToDatabase();

    // Insert or update table bill
    await pool.execute(
      `INSERT INTO table_bills (tableNumber, adultCount, child120Count, child100Count, drinkRefillCount, adultPrice, child120Price, drinkRefillPrice, totalPrice) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         adultCount = VALUES(adultCount),
         child120Count = VALUES(child120Count),
         child100Count = VALUES(child100Count),
         drinkRefillCount = VALUES(drinkRefillCount),
         totalPrice = VALUES(totalPrice),
         updatedAt = NOW()`,
      [
        tableNumber,
        adultCount || 0,
        child120Count || 0,
        child100Count || 0,
        drinkRefillCount || 0,
        adultPrice,
        child120Price,
        drinkRefillPrice,
        totalPrice
      ]
    );

    // Don't create empty order when opening table
    // Order will be created only when user actually places an order with items

    return NextResponse.json({
      success: true,
      message: 'Table bill created successfully',
      totalPrice,
    });
  } catch (error) {
    console.error('Error creating table bill:', error);
    return NextResponse.json(
      { error: 'Failed to create table bill' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableNumber = searchParams.get('table');

    const pool = await connectToDatabase();

    if (tableNumber) {
      const [rows] = await pool.execute(
        'SELECT * FROM table_bills WHERE tableNumber = ? ORDER BY updatedAt DESC LIMIT 1',
        [tableNumber]
      ) as any;

      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          bill: null,
        });
      }

      return NextResponse.json({
        success: true,
        bill: {
          id: rows[0].id,
          tableNumber: rows[0].tableNumber,
          adultCount: rows[0].adultCount,
          child120Count: rows[0].child120Count,
          child100Count: rows[0].child100Count,
          drinkRefillCount: rows[0].drinkRefillCount,
          adultPrice: parseFloat(rows[0].adultPrice),
          child120Price: parseFloat(rows[0].child120Price),
          drinkRefillPrice: parseFloat(rows[0].drinkRefillPrice),
          totalPrice: parseFloat(rows[0].totalPrice),
          createdAt: rows[0].createdAt,
          updatedAt: rows[0].updatedAt,
        },
      });
    } else {
      const [rows] = await pool.execute(
        'SELECT * FROM table_bills ORDER BY updatedAt DESC'
      ) as any;

      const bills = rows.map((row: any) => ({
        id: row.id,
        tableNumber: row.tableNumber,
        adultCount: row.adultCount,
        child120Count: row.child120Count,
        child100Count: row.child100Count,
        drinkRefillCount: row.drinkRefillCount,
        adultPrice: parseFloat(row.adultPrice),
        child120Price: parseFloat(row.child120Price),
        drinkRefillPrice: parseFloat(row.drinkRefillPrice),
        totalPrice: parseFloat(row.totalPrice),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      return NextResponse.json({
        success: true,
        bills,
      });
    }
  } catch (error) {
    console.error('Error fetching table bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table bills' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableNumber = searchParams.get('table');

    if (!tableNumber) {
      return NextResponse.json(
        { error: 'Table number is required' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    const [result] = await pool.execute(
      'DELETE FROM table_bills WHERE tableNumber = ?',
      [tableNumber]
    ) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Table bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Table bill deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting table bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete table bill' },
      { status: 500 }
    );
  }
}


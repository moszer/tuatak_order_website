import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, all
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const pool = await connectToDatabase();

    // Build date filter and params — each query gets its own params array
    const buildFilter = (): { filter: string; params: any[] } => {
      if (startDate && endDate) {
        return { filter: 'WHERE DATE(paidAt) BETWEEN ? AND ?', params: [startDate, endDate] };
      }
      const now = new Date();
      switch (period) {
        case 'today': {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return { filter: 'WHERE DATE(paidAt) = ?', params: [d.toISOString().split('T')[0]] };
        }
        case 'week': {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          return { filter: 'WHERE DATE(paidAt) >= ?', params: [d.toISOString().split('T')[0]] };
        }
        case 'month': {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 1);
          return { filter: 'WHERE DATE(paidAt) >= ?', params: [d.toISOString().split('T')[0]] };
        }
        default:
          return { filter: '', params: [] };
      }
    };

    const { filter: dateFilter, params: filterParams } = buildFilter();

    // Get payments summary — own params copy
    const [payments] = await pool.execute(
      `SELECT
        SUM(foodRevenue) as totalFoodRevenue,
        SUM(buffetRevenue) as totalBuffetRevenue,
        SUM(totalRevenue) as totalRevenue,
        SUM(ordersCount) as totalOrdersCount,
        COUNT(*) as paymentsCount,
        COUNT(DISTINCT tableNumber) as uniqueTablesCount
       FROM payments ${dateFilter}`,
      [...filterParams]
    ) as any;

    // Get daily breakdown — own params copy
    const [dailyBreakdown] = await pool.execute(
      `SELECT
        DATE(paidAt) as date,
        SUM(foodRevenue) as foodRevenue,
        SUM(buffetRevenue) as buffetRevenue,
        SUM(totalRevenue) as totalRevenue,
        SUM(ordersCount) as ordersCount,
        COUNT(*) as paymentsCount
       FROM payments ${dateFilter}
       GROUP BY DATE(paidAt)
       ORDER BY date DESC
       LIMIT 30`,
      [...filterParams]
    ) as any;

    // Get table breakdown — own params copy
    const [tableBreakdown] = await pool.execute(
      `SELECT
        tableNumber,
        SUM(foodRevenue) as foodRevenue,
        SUM(buffetRevenue) as buffetRevenue,
        SUM(totalRevenue) as totalRevenue,
        SUM(ordersCount) as ordersCount,
        COUNT(*) as paymentsCount
       FROM payments ${dateFilter}
       GROUP BY tableNumber
       ORDER BY totalRevenue DESC
       LIMIT 20`,
      [...filterParams]
    ) as any;

    // Get individual payment records — own params copy
    const [individualPayments] = await pool.execute(
      `SELECT
        id, tableNumber, foodRevenue, buffetRevenue, totalRevenue,
        ordersCount, paymentMethod, notes, paidAt
       FROM payments ${dateFilter}
       ORDER BY paidAt DESC`,
      [...filterParams]
    ) as any;

    return NextResponse.json({
      success: true,
      summary: {
        totalFoodRevenue: parseFloat(payments[0]?.totalFoodRevenue || 0),
        totalBuffetRevenue: parseFloat(payments[0]?.totalBuffetRevenue || 0),
        totalRevenue: parseFloat(payments[0]?.totalRevenue || 0),
        totalOrdersCount: parseInt(payments[0]?.totalOrdersCount || 0),
        paymentsCount: parseInt(payments[0]?.paymentsCount || 0),
        uniqueTablesCount: parseInt(payments[0]?.uniqueTablesCount || 0),
      },
      dailyBreakdown: dailyBreakdown.map((row: any) => ({
        date: row.date,
        foodRevenue: parseFloat(row.foodRevenue || 0),
        buffetRevenue: parseFloat(row.buffetRevenue || 0),
        totalRevenue: parseFloat(row.totalRevenue || 0),
        ordersCount: parseInt(row.ordersCount || 0),
        paymentsCount: parseInt(row.paymentsCount || 0),
      })),
      tableBreakdown: tableBreakdown.map((row: any) => ({
        tableNumber: row.tableNumber,
        foodRevenue: parseFloat(row.foodRevenue || 0),
        buffetRevenue: parseFloat(row.buffetRevenue || 0),
        totalRevenue: parseFloat(row.totalRevenue || 0),
        ordersCount: parseInt(row.ordersCount || 0),
        paymentsCount: parseInt(row.paymentsCount || 0),
      })),
      individualPayments: individualPayments.map((row: any) => ({
        id: row.id,
        tableNumber: row.tableNumber,
        foodRevenue: parseFloat(row.foodRevenue || 0),
        buffetRevenue: parseFloat(row.buffetRevenue || 0),
        totalRevenue: parseFloat(row.totalRevenue || 0),
        ordersCount: parseInt(row.ordersCount || 0),
        paymentMethod: row.paymentMethod || 'cash',
        notes: row.notes || '',
        paidAt: row.paidAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching cashflow data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cashflow data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableNumber, foodRevenue, buffetRevenue, totalRevenue, ordersCount, paymentMethod, notes } = body;

    if (!tableNumber || totalRevenue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tableNumber, totalRevenue' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    const [result] = await pool.execute(
      `INSERT INTO payments (tableNumber, foodRevenue, buffetRevenue, totalRevenue, ordersCount, paymentMethod, notes, paidAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tableNumber,
        foodRevenue || 0,
        buffetRevenue || 0,
        totalRevenue,
        ordersCount || 0,
        paymentMethod || 'cash',
        notes || null,
      ]
    ) as any;

    return NextResponse.json({
      success: true,
      paymentId: result.insertId,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pool = await connectToDatabase();

    // Delete all payments
    await pool.execute('DELETE FROM payments');

    return NextResponse.json({
      success: true,
      message: 'All payments data has been reset',
    });
  } catch (error) {
    console.error('Error resetting payments:', error);
    return NextResponse.json(
      { error: 'Failed to reset payments' },
      { status: 500 }
    );
  }
}


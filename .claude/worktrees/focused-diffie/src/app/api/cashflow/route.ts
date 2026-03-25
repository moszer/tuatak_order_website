import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, all
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const pool = await connectToDatabase();

    // Calculate date range based on period
    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(paidAt) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      const now = new Date();
      switch (period) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateFilter = 'WHERE DATE(paidAt) = ?';
          params.push(today.toISOString().split('T')[0]);
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = 'WHERE DATE(paidAt) >= ?';
          params.push(weekAgo.toISOString().split('T')[0]);
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateFilter = 'WHERE DATE(paidAt) >= ?';
          params.push(monthAgo.toISOString().split('T')[0]);
          break;
        case 'all':
          dateFilter = '';
          break;
      }
    }

    // Get payments summary
    const [payments] = await pool.execute(
      `SELECT 
        SUM(foodRevenue) as totalFoodRevenue,
        SUM(buffetRevenue) as totalBuffetRevenue,
        SUM(totalRevenue) as totalRevenue,
        SUM(ordersCount) as totalOrdersCount,
        COUNT(*) as paymentsCount,
        COUNT(DISTINCT tableNumber) as uniqueTablesCount
       FROM payments ${dateFilter}`,
      params
    ) as any;

    // Get daily breakdown for the period
    let dailyBreakdownQuery = '';
    if (startDate && endDate) {
      dailyBreakdownQuery = `WHERE DATE(paidAt) BETWEEN ? AND ?`;
    } else {
      const now = new Date();
      switch (period) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dailyBreakdownQuery = `WHERE DATE(paidAt) = ?`;
          params.push(today.toISOString().split('T')[0]);
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dailyBreakdownQuery = `WHERE DATE(paidAt) >= ?`;
          params.push(weekAgo.toISOString().split('T')[0]);
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dailyBreakdownQuery = `WHERE DATE(paidAt) >= ?`;
          params.push(monthAgo.toISOString().split('T')[0]);
          break;
      }
    }

    const [dailyBreakdown] = await pool.execute(
      `SELECT 
        DATE(paidAt) as date,
        SUM(foodRevenue) as foodRevenue,
        SUM(buffetRevenue) as buffetRevenue,
        SUM(totalRevenue) as totalRevenue,
        SUM(ordersCount) as ordersCount,
        COUNT(*) as paymentsCount
       FROM payments ${dailyBreakdownQuery || ''}
       GROUP BY DATE(paidAt)
       ORDER BY date DESC
       LIMIT 30`,
      dailyBreakdownQuery ? params : []
    ) as any;

    // Get table breakdown
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
      params
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


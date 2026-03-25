import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Order } from '@/lib/mysql';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tableNumber, items, totalPrice } = body;

        if (!tableNumber || !items || items.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields: tableNumber, items' },
                { status: 400 }
            );
        }

        const pool = await connectToDatabase();

        // Check if table is open (ready) before allowing order
        const [tableStatusRows] = await pool.execute(
            'SELECT * FROM table_status WHERE tableNumber = ?',
            [tableNumber]
        ) as any;

        const isReady = tableStatusRows.length > 0 && Boolean(tableStatusRows[0].isReady);

        if (!isReady) {
            return NextResponse.json(
                { error: 'Table is not open. Please ask staff to open the table first.' },
                { status: 403 }
            );
        }

        const [result] = await pool.execute(
            `INSERT INTO orders (tableNumber, items, totalPrice, status, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [
                tableNumber,
                JSON.stringify(items),
                totalPrice,
                'pending'
            ]
        ) as any;

        return NextResponse.json({
            success: true,
            orderId: result.insertId.toString(),
            message: 'Order placed successfully',
        });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tableNumber = searchParams.get('table');
        const status = searchParams.get('status');

        const pool = await connectToDatabase();

        let query = 'SELECT * FROM orders WHERE 1=1';
        const params: any[] = [];

        if (tableNumber) {
            query += ' AND tableNumber = ?';
            params.push(tableNumber);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY createdAt DESC';

        const [rows] = await pool.execute(query, params) as any;

        // Get table bills for all orders
        const tableNumbers = [...new Set(rows.map((order: any) => order.tableNumber))];
        const billsMap: Record<string, any> = {};
        
        if (tableNumbers.length > 0) {
          try {
            // Use proper parameterized query
            const placeholders = tableNumbers.map(() => '?').join(',');
            const [bills] = await pool.execute(
              `SELECT * FROM table_bills WHERE tableNumber IN (${placeholders})`,
              tableNumbers
            ) as any;
            
            console.log('Fetched bills from DB:', bills);
            console.log('Table numbers requested:', tableNumbers);
            
            bills.forEach((bill: any) => {
              billsMap[bill.tableNumber] = {
                adultCount: bill.adultCount || 0,
                child120Count: bill.child120Count || 0,
                child100Count: bill.child100Count || 0,
                drinkRefillCount: bill.drinkRefillCount || 0,
                adultPrice: parseFloat(bill.adultPrice || 199),
                child120Price: parseFloat(bill.child120Price || 130),
                drinkRefillPrice: parseFloat(bill.drinkRefillPrice || 39),
                totalPrice: parseFloat(bill.totalPrice || 0),
              };
            });
            
            console.log('Bills map created:', billsMap);
          } catch (billError) {
            console.error('Error fetching bills:', billError);
            // Continue without bills if there's an error
          }
        }

        // Convert to Order format with _id for backward compatibility
        const serializedOrders = rows.map((order: any) => {
          const bill = billsMap[order.tableNumber] || null;
          console.log(`Order ${order.id} - Table ${order.tableNumber} bill:`, bill);
          return {
            id: order.id,
            _id: order.id.toString(), // For backward compatibility
            tableNumber: order.tableNumber,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            totalPrice: parseFloat(order.totalPrice),
            status: order.status,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.updatedAt),
            bill: bill,
          };
        });

        console.log('Serialized orders with bills:', serializedOrders.map((o: any) => ({
            id: o.id,
            table: o.tableNumber,
            hasBill: !!o.bill
        })));

        return NextResponse.json({ orders: serializedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}

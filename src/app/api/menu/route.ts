import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase();
    const [rows] = await pool.execute(
      'SELECT * FROM menu_items ORDER BY displayOrder ASC, id ASC'
    ) as any;

    const menuItems = rows.map((item: any) => ({
      id: item.id,
      name: item.name,
      nameTh: item.nameTh,
      description: item.description,
      price: parseFloat(item.price),
      image: item.image,
      category: item.category,
      isPopular: Boolean(item.isPopular),
      isSpicy: Boolean(item.isSpicy),
      isNew: Boolean(item.isNew),
    }));

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameTh, description, price, image, category, isPopular, isSpicy, isNew, displayOrder } = body;

    if (!name || !nameTh || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, nameTh, category' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();
    const [result] = await pool.execute(
      `INSERT INTO menu_items (name, nameTh, description, price, image, category, isPopular, isSpicy, isNew, displayOrder) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        nameTh,
        description || null,
        price || 0,
        image || null,
        category,
        isPopular || false,
        isSpicy || false,
        isNew || false,
        displayOrder || 0
      ]
    ) as any;

    return NextResponse.json({
      success: true,
      menuItemId: result.insertId,
      message: 'Menu item created successfully',
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}


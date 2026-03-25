import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, nameTh, description, price, image, category, isPopular, isSpicy, isNew, displayOrder } = body;

    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid menu item ID format' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (nameTh !== undefined) {
      updates.push('nameTh = ?');
      values.push(nameTh);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      values.push(image);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (isPopular !== undefined) {
      updates.push('isPopular = ?');
      values.push(isPopular);
    }
    if (isSpicy !== undefined) {
      updates.push('isSpicy = ?');
      values.push(isSpicy);
    }
    if (isNew !== undefined) {
      updates.push('isNew = ?');
      values.push(isNew);
    }
    if (displayOrder !== undefined) {
      updates.push('displayOrder = ?');
      values.push(displayOrder);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(orderId);

    const [result] = await pool.execute(
      `UPDATE menu_items SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      values
    ) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully',
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid menu item ID format' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();
    const [result] = await pool.execute(
      'DELETE FROM menu_items WHERE id = ?',
      [itemId]
    ) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}


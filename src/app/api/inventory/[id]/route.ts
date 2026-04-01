import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// GET /api/inventory/[id] - Get single inventory item with suppliers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                contact: true,
                phone: true,
                email: true,
                active: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update inventory item
// Only ADMIN/SUPERVISOR can modify
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can update inventory items.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, sku, category, quantity, minStock, unit, location } = body;

    // Check if item exists
    const existingItem = await db.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // If SKU is being changed, check for uniqueness
    if (sku && sku !== existingItem.sku) {
      const skuConflict = await db.inventoryItem.findUnique({
        where: { sku },
      });
      if (skuConflict) {
        return NextResponse.json(
          { error: 'An item with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(sku && { sku }),
        ...(category && { category }),
        ...(quantity !== undefined && { quantity }),
        ...(minStock !== undefined && { minStock }),
        ...(unit && { unit }),
        ...(location !== undefined && { location: location || null }),
      },
      include: {
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                contact: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Soft delete (set active=false)
// Only ADMIN/SUPERVISOR can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can delete inventory items.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if item exists
    const existingItem = await db.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
      item,
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}

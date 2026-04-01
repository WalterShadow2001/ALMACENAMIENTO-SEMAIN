import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// GET /api/inventory - List all inventory items with suppliers
// Supports ?search= and ?category= query params
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: Record<string, unknown> = {
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const items = await db.inventoryItem.findMany({
      where,
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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
// Only ADMIN/SUPERVISOR can create
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can create inventory items.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, sku, category, quantity, minStock, unit, location } = body;

    // Validate required fields
    if (!name || !sku || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, category' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingItem = await db.inventoryItem.findUnique({
      where: { sku },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'An item with this SKU already exists' },
        { status: 409 }
      );
    }

    const item = await db.inventoryItem.create({
      data: {
        name,
        description: description || null,
        sku,
        category,
        quantity: quantity ?? 0,
        minStock: minStock ?? 5,
        unit: unit || 'PIEZA',
        location: location || null,
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

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

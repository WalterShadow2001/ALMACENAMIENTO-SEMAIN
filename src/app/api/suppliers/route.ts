import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// GET /api/suppliers - List all suppliers
export async function GET() {
  try {
    const suppliers = await db.supplier.findMany({
      where: { active: true },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
// Only ADMIN/SUPERVISOR can create
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can create suppliers.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, contact, phone, email, address, notes } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// GET /api/suppliers/[id] - Get single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                quantity: true,
                active: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Update supplier
// Only ADMIN/SUPERVISOR can modify
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can update suppliers.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, contact, phone, email, address, notes } = body;

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(contact !== undefined && { contact: contact || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(notes !== undefined && { notes: notes || null }),
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

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Soft delete (set active=false)
// Only ADMIN/SUPERVISOR can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can delete suppliers.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if supplier exists
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      message: 'Supplier deleted successfully',
      supplier,
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}

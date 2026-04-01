import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/inventory/[id]/suppliers - Add supplier to product
// Only ADMIN/SUPERVISOR can add
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can manage product suppliers.' },
        { status: 403 }
      );
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { supplierId, price, leadDays, notes } = body;

    // Validate required fields
    if (!supplierId || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: supplierId, price' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await db.inventoryItem.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Check if supplier exists
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Check if the product-supplier link already exists
    const existingLink = await db.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'This supplier is already linked to this product' },
        { status: 409 }
      );
    }

    const productSupplier = await db.productSupplier.create({
      data: {
        productId,
        supplierId,
        price: parseFloat(price),
        leadDays: leadDays ?? 7,
        notes: notes || null,
      },
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
    });

    return NextResponse.json({ productSupplier }, { status: 201 });
  } catch (error) {
    console.error('Error adding supplier to product:', error);
    return NextResponse.json(
      { error: 'Failed to add supplier to product' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id]/suppliers - Remove supplier from product
// Only ADMIN/SUPERVISOR can remove
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Unauthorized. Only ADMIN or SUPERVISOR can manage product suppliers.' },
        { status: 403 }
      );
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { productSupplierId } = body;

    if (!productSupplierId) {
      return NextResponse.json(
        { error: 'Missing required field: productSupplierId' },
        { status: 400 }
      );
    }

    // Verify the product supplier link exists and belongs to this product
    const existingLink = await db.productSupplier.findUnique({
      where: { id: productSupplierId },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Product-supplier link not found' },
        { status: 404 }
      );
    }

    if (existingLink.productId !== productId) {
      return NextResponse.json(
        { error: 'This supplier link does not belong to this product' },
        { status: 400 }
      );
    }

    await db.productSupplier.delete({
      where: { id: productSupplierId },
    });

    return NextResponse.json({
      message: 'Supplier removed from product successfully',
    });
  } catch (error) {
    console.error('Error removing supplier from product:', error);
    return NextResponse.json(
      { error: 'Failed to remove supplier from product' },
      { status: 500 }
    );
  }
}

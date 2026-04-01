import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, JWTPayload } from '@/lib/auth';

// GET /api/requisitions — List all requisitions with items and user info
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { createdBy: { name: { contains: search } } },
      ];
    }

    const requisitions = await db.requisition.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        supplier: {
          select: { id: true, name: true, contact: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, unit: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('[GET /api/requisitions] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener las requisiciones' },
      { status: 500 }
    );
  }
}

// POST /api/requisitions — Create a new requisition
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, supplierId, items } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'El título es obligatorio' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'La requisición debe tener al menos un artículo' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.inventoryItemId) {
        return NextResponse.json(
          { error: 'Cada artículo debe tener un ID de inventario válido' },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: 'La cantidad de cada artículo debe ser mayor a 0' },
          { status: 400 }
        );
      }
    }

    // Validate supplier exists if provided
    if (supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) {
        return NextResponse.json(
          { error: 'Proveedor no encontrado' },
          { status: 400 }
        );
      }
    }

    // Validate inventory items exist
    const inventoryItemIds = items.map((i: { inventoryItemId: string }) => i.inventoryItemId);
    const existingItems = await db.inventoryItem.findMany({
      where: { id: { in: inventoryItemIds } },
    });

    if (existingItems.length !== inventoryItemIds.length) {
      return NextResponse.json(
        { error: 'Uno o más artículos de inventario no existen' },
        { status: 400 }
      );
    }

    // Create the requisition with items in a transaction
    const requisition = await db.requisition.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIA',
        createdById: user.userId,
        supplierId: supplierId || null,
        status: 'PENDIENTE',
        items: {
          create: items.map(
            (item: { inventoryItemId: string; quantity: number; notes?: string }) => ({
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
              notes: item.notes?.trim() || null,
            })
          ),
        },
      },
      include: {
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json(requisition, { status: 201 });
  } catch (error) {
    console.error('[POST /api/requisitions] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear la requisición' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/requisitions/[id]/complete — Complete requisition, deduct inventory
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Only ADMIN or SUPERVISOR can complete requisitions
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Solo un administrador o supervisor pueden completar requisiciones' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check requisition exists with items
    const existing = await db.requisition.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, quantity: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Requisición no encontrada' },
        { status: 404 }
      );
    }

    // Only EN_CURSO requisitions can be completed
    if (existing.status !== 'EN_CURSO') {
      return NextResponse.json(
        { error: 'Solo se pueden completar requisiciones en estado EN_CURSO' },
        { status: 400 }
      );
    }

    // Validate sufficient inventory for all items
    for (const item of existing.items) {
      if (item.inventoryItem.quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Inventario insuficiente para "${item.inventoryItem.name}". Disponible: ${item.inventoryItem.quantity}, Solicitado: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
    }

    // Complete the requisition and deduct inventory in a transaction
    const requisition = await db.$transaction(async (tx) => {
      // Deduct inventory quantities
      for (const item of existing.items) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Update requisition status
      return tx.requisition.update({
        where: { id },
        data: {
          status: 'COMPLETADA',
          completedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, username: true, name: true, role: true },
          },
          approvedBy: {
            select: { id: true, username: true, name: true, role: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              inventoryItem: {
                select: { id: true, name: true, sku: true, unit: true, quantity: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(requisition);
  } catch (error) {
    console.error('[POST /api/requisitions/:id/complete] Error:', error);
    return NextResponse.json(
      { error: 'Error al completar la requisición' },
      { status: 500 }
    );
  }
}

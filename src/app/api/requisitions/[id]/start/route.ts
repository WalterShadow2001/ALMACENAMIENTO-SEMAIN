import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/requisitions/[id]/start — Change status to EN_CURSO (ADMIN/SUPERVISOR only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Only ADMIN or SUPERVISOR can start requisitions
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Solo un administrador o supervisor pueden iniciar requisiciones' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check requisition exists
    const existing = await db.requisition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Requisición no encontrada' },
        { status: 404 }
      );
    }

    // Only APROBADA requisitions can be started
    if (existing.status !== 'APROBADA') {
      return NextResponse.json(
        { error: 'Solo se pueden iniciar requisiciones en estado APROBADA' },
        { status: 400 }
      );
    }

    const requisition = await db.requisition.update({
      where: { id },
      data: {
        status: 'EN_CURSO',
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
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json(requisition);
  } catch (error) {
    console.error('[POST /api/requisitions/:id/start] Error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar la requisición' },
      { status: 500 }
    );
  }
}

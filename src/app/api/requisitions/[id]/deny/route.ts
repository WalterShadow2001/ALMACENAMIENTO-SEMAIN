import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/requisitions/[id]/deny — Deny requisition (ADMIN/SUPERVISOR only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Only ADMIN or SUPERVISOR can deny requisitions
    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json(
        { error: 'Solo un administrador o supervisor pueden denegar requisiciones' },
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

    // Only PENDIENTE requisitions can be denied
    if (existing.status !== 'PENDIENTE') {
      return NextResponse.json(
        { error: 'Solo se pueden denegar requisiciones en estado PENDIENTE' },
        { status: 400 }
      );
    }

    // Denier cannot be the creator
    if (existing.createdById === user.userId) {
      return NextResponse.json(
        { error: 'El creador no puede denegar su propia requisición' },
        { status: 400 }
      );
    }

    // Optionally read denial reason from body
    let notes = existing.notes || '';
    try {
      const body = await request.json();
      if (body.reason) {
        notes = notes
          ? `${notes}\n[Motivo de denegación: ${body.reason}]`
          : `[Motivo de denegación: ${body.reason}]`;
      }
    } catch {
      // No body provided — that's fine
    }

    const requisition = await db.requisition.update({
      where: { id },
      data: {
        status: 'DENEGADA',
        notes: notes || null,
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
    console.error('[POST /api/requisitions/:id/deny] Error:', error);
    return NextResponse.json(
      { error: 'Error al denegar la requisición' },
      { status: 500 }
    );
  }
}

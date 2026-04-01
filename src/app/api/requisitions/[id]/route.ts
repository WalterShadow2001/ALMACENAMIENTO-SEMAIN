import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// GET /api/requisitions/[id] — Get a single requisition with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const requisition = await db.requisition.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, name: true, role: true },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                category: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!requisition) {
      return NextResponse.json(
        { error: 'Requisición no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(requisition);
  } catch (error) {
    console.error('[GET /api/requisitions/:id] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener la requisición' },
      { status: 500 }
    );
  }
}

// PUT /api/requisitions/[id] — Update requisition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description, notes, trackingNumber, hasInvoice, invoiceNumber, title } = body;

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

    // ADMIN/SUPERVISOR can edit anything on PENDIENTE/EN_CURSO/APROBADA
    // Creator can only edit description/notes on PENDIENTE
    const canEditFull = hasRole(user, ['ADMIN', 'SUPERVISOR']);
    const isCreator = existing.createdById === user.userId;

    if (!canEditFull && !isCreator) {
      return NextResponse.json({ error: 'No tiene permisos para editar esta requisición' }, { status: 403 });
    }

    // Only allow editing if status is PENDIENTE, APROBADA or EN_CURSO
    if (!['PENDIENTE', 'APROBADA', 'EN_CURSO'].includes(existing.status)) {
      return NextResponse.json({ error: 'Solo se pueden editar requisiciones en estado PENDIENTE, APROBADA o EN_CURSO' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined && canEditFull) updateData.title = title?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (trackingNumber !== undefined && canEditFull) updateData.trackingNumber = trackingNumber?.trim() || null;
    if (hasInvoice !== undefined && canEditFull) updateData.hasInvoice = hasInvoice;
    if (invoiceNumber !== undefined && canEditFull) updateData.invoiceNumber = invoiceNumber?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const requisition = await db.requisition.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, username: true, name: true, role: true } },
        approvedBy: { select: { id: true, username: true, name: true, role: true } },
        supplier: { select: { id: true, name: true } },
        items: { include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });

    return NextResponse.json(requisition);
  } catch (error) {
    console.error('[PUT /api/requisitions/:id] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar la requisición' }, { status: 500 });
  }
}

// DELETE /api/requisitions/[id] — Delete requisition (only creator or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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

    // Only creator or admin can delete
    if (existing.createdById !== user.userId && !hasRole(user, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Solo el creador o un administrador pueden eliminar esta requisición' },
        { status: 403 }
      );
    }

    // Only allow deletion if status is PENDIENTE or DENEGADA
    if (!['PENDIENTE', 'DENEGADA'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar requisiciones en estado PENDIENTE o DENEGADA' },
        { status: 400 }
      );
    }

    await db.requisition.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Requisición eliminada correctamente' });
  } catch (error) {
    console.error('[DELETE /api/requisitions/:id] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la requisición' },
      { status: 500 }
    );
  }
}

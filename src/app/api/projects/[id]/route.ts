import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

const VALID_TYPES = ['MANDRIL', 'FIXTURA'];
const VALID_STATUSES = ['PENDIENTE', 'EN_DISENO', 'MATERIALES_APARTADOS', 'EN_CORTE', 'EN_PRODUCCION', 'PAUSADO', 'COMPLETADO'];
const VALID_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

// GET /api/projects/[id] — Get single project with full details
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

    const project = await db.project.findUnique({
      where: { id },
      include: {
        components: {
          include: {
            materialType: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        reservations: {
          include: {
            materialStock: {
              include: {
                type: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        logs: {
          include: {
            user: {
              select: { id: true, username: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        toolUsages: {
          include: {
            tool: true,
            user: {
              select: { id: true, username: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/projects/[id] — Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, type, priority, wastePercent, dueDate, notes } = body;

    // Check project exists
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Validate type if provided
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Tipo inválido. Debe ser: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    // Validate priority if provided
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Prioridad inválida. Debe ser: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    // Validate wastePercent if provided
    if (wastePercent !== undefined && (wastePercent < 1.5 || wastePercent > 4)) {
      return NextResponse.json({ error: 'El porcentaje de desperdicio debe estar entre 1.5 y 4' }, { status: 400 });
    }

    const project = await db.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(wastePercent !== undefined && { wastePercent }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        components: {
          include: { materialType: true },
        },
        reservations: {
          include: {
            materialStock: { include: { type: true } },
          },
        },
      },
    });

    // Create production log for the update
    await db.productionLog.create({
      data: {
        projectId: project.id,
        userId: user.userId,
        action: 'EDITAR',
        details: `Proyecto "${project.name}" actualizado`,
      },
    });

    return NextResponse.json({ data: project });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — Delete project (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Solo un administrador puede eliminar proyectos' }, { status: 403 });
    }

    const { id } = await params;

    // Check project exists
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Release all active reservations before deleting
    const activeReservations = await db.materialReservation.findMany({
      where: { projectId: id, status: 'ACTIVA' },
    });

    for (const reservation of activeReservations) {
      await db.materialStock.update({
        where: { id: reservation.materialStockId },
        data: {
          lengthAvailable: {
            increment: reservation.lengthReserved,
          },
        },
      });
    }

    // Delete the project (cascade will handle related records)
    await db.project.delete({ where: { id } });

    return NextResponse.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

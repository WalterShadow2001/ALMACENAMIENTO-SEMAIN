import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

const VALID_STATUSES = ['PENDIENTE', 'EN_DISENO', 'MATERIALES_APARTADOS', 'EN_CORTE', 'EN_PRODUCCION', 'PAUSADO', 'COMPLETADO'];

// POST /api/projects/[id]/status — Change project status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json({ error: 'Sin permisos para cambiar el estado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Estado inválido. Debe ser uno de: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check project exists and get current status
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Prevent setting the same status
    if (existing.status === status) {
      return NextResponse.json({ error: `El proyecto ya está en estado ${status}` }, { status: 400 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status,
    };

    // When status is COMPLETADO, set completedAt and startDate if not set
    if (status === 'COMPLETADO') {
      updateData.completedAt = new Date();
      if (!existing.startDate) {
        updateData.startDate = new Date();
      }
    }

    // If moving out of PAUSADO back to active, clear completedAt if it was set
    if (status !== 'COMPLETADO') {
      updateData.completedAt = null;
    }

    // Update project status
    const project = await db.project.update({
      where: { id },
      data: updateData,
    });

    // Create production log entry
    await db.productionLog.create({
      data: {
        projectId: id,
        userId: user.userId,
        action: 'CAMBIO_ESTADO',
        details: `Estado cambiado de "${existing.status}" a "${status}"`,
      },
    });

    return NextResponse.json({
      data: project,
      message: `Estado del proyecto actualizado a "${status}"`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

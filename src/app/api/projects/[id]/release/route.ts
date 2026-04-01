import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/projects/[id]/release — Release material reservation
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
      return NextResponse.json({ error: 'Sin permisos para liberar reservas' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reservationId } = body;

    // Validate required fields
    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId es obligatorio' }, { status: 400 });
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Check reservation exists and belongs to this project
    const reservation = await db.materialReservation.findFirst({
      where: { id: reservationId, projectId: id },
    });
    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // Check reservation is still active
    if (reservation.status !== 'ACTIVA') {
      return NextResponse.json({ error: 'Esta reservación ya fue liberada' }, { status: 400 });
    }

    // Use a transaction to ensure atomicity: return stock and update reservation
    const result = await db.$transaction(async (tx) => {
      // Return length to material stock
      const updatedStock = await tx.materialStock.update({
        where: { id: reservation.materialStockId },
        data: {
          lengthAvailable: {
            increment: reservation.lengthReserved,
          },
        },
        include: { type: true },
      });

      // Update reservation status
      const updatedReservation = await tx.materialReservation.update({
        where: { id: reservationId },
        data: {
          status: 'LIBERADA',
        },
        include: {
          materialStock: {
            include: { type: true },
          },
        },
      });

      return { reservation: updatedReservation, stock: updatedStock };
    });

    // Create production log
    await db.productionLog.create({
      data: {
        projectId: id,
        userId: user.userId,
        action: 'LIBERAR_MATERIAL',
        details: `Liberados ${reservation.lengthReserved} unidades de la reservación (ID: ${reservationId})`,
      },
    });

    return NextResponse.json({
      data: result.reservation,
      message: `Liberados ${reservation.lengthReserved} unidades del material exitosamente`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/projects/[id]/reserve — Reserve material for project
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
      return NextResponse.json({ error: 'Sin permisos para reservar materiales' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { materialStockId, lengthReserved } = body;

    // Validate required fields
    if (!materialStockId) {
      return NextResponse.json({ error: 'materialStockId es obligatorio' }, { status: 400 });
    }

    if (!lengthReserved || lengthReserved <= 0) {
      return NextResponse.json({ error: 'lengthReserved debe ser un número positivo' }, { status: 400 });
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Check material stock exists and has enough available length
    const stock = await db.materialStock.findUnique({
      where: { id: materialStockId },
      include: { type: true },
    });
    if (!stock) {
      return NextResponse.json({ error: 'Material en inventario no encontrado' }, { status: 404 });
    }

    if (stock.lengthAvailable < lengthReserved) {
      return NextResponse.json(
        {
          error: `Material insuficiente. Disponible: ${stock.lengthAvailable}, Solicitado: ${lengthReserved}`,
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity: deduct stock and create reservation
    const reservation = await db.$transaction(async (tx) => {
      // Deduct from available length
      const updatedStock = await tx.materialStock.update({
        where: { id: materialStockId },
        data: {
          lengthAvailable: {
            decrement: lengthReserved,
          },
        },
        include: { type: true },
      });

      // Create reservation record
      const newReservation = await tx.materialReservation.create({
        data: {
          projectId: id,
          materialStockId,
          lengthReserved,
          status: 'ACTIVA',
        },
        include: {
          materialStock: {
            include: { type: true },
          },
        },
      });

      return { reservation: newReservation, stock: updatedStock };
    });

    // Create production log
    await db.productionLog.create({
      data: {
        projectId: id,
        userId: user.userId,
        action: 'RESERVAR_MATERIAL',
        details: `Reservados ${lengthReserved} unidades de "${stock.type.name}" (ID: ${materialStockId})`,
      },
    });

    return NextResponse.json(
      {
        data: reservation.reservation,
        message: `Reservados ${lengthReserved} del material exitosamente`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const tool = await db.consumableTool.findUnique({
      where: { id },
      include: {
        type: true,
        usages: {
          include: {
            user: { select: { id: true, username: true, name: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!tool || !tool.active) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error('Error fetching tool:', error);
    return NextResponse.json({ error: 'Error al obtener herramienta' }, { status: 500 });
  }
}

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
    const { name, typeId, description, quantity, minStock, averageLifeSpan, unit, location } = body;

    const existing = await db.consumableTool.findUnique({ where: { id } });
    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    if (typeId) {
      const toolType = await db.toolType.findUnique({ where: { id: typeId } });
      if (!toolType) {
        return NextResponse.json({ error: 'Tipo de herramienta no encontrado' }, { status: 404 });
      }
    }

    const tool = await db.consumableTool.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        typeId: typeId ?? existing.typeId,
        description: description !== undefined ? description : existing.description,
        quantity: quantity !== undefined ? quantity : existing.quantity,
        minStock: minStock !== undefined ? minStock : existing.minStock,
        averageLifeSpan: averageLifeSpan !== undefined ? averageLifeSpan : existing.averageLifeSpan,
        unit: unit ?? existing.unit,
        location: location !== undefined ? location : existing.location,
      },
      include: { type: true },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json({ error: 'Error al actualizar herramienta' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const existing = await db.consumableTool.findUnique({ where: { id } });
    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    const tool = await db.consumableTool.update({
      where: { id },
      data: { active: false },
      include: { type: true },
    });

    return NextResponse.json(tool);
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json({ error: 'Error al eliminar herramienta' }, { status: 500 });
  }
}

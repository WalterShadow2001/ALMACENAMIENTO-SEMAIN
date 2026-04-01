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

    const toolType = await db.toolType.findUnique({
      where: { id },
      include: {
        tools: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!toolType || !toolType.active) {
      return NextResponse.json({ error: 'Tipo de herramienta no encontrado' }, { status: 404 });
    }

    return NextResponse.json(toolType);
  } catch (error) {
    console.error('Error fetching tool type:', error);
    return NextResponse.json({ error: 'Error al obtener tipo de herramienta' }, { status: 500 });
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
    const { name, description } = body;

    const existing = await db.toolType.findUnique({ where: { id } });
    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Tipo de herramienta no encontrado' }, { status: 404 });
    }

    if (name && name !== existing.name) {
      const duplicate = await db.toolType.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json({ error: 'Ya existe un tipo con ese nombre' }, { status: 409 });
      }
    }

    const toolType = await db.toolType.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
      },
    });

    return NextResponse.json(toolType);
  } catch (error) {
    console.error('Error updating tool type:', error);
    return NextResponse.json({ error: 'Error al actualizar tipo de herramienta' }, { status: 500 });
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

    const existing = await db.toolType.findUnique({
      where: { id },
      include: { _count: { select: { tools: true } } },
    });

    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Tipo de herramienta no encontrado' }, { status: 404 });
    }

    if (existing._count.tools > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un tipo que tiene herramientas asociadas' },
        { status: 400 }
      );
    }

    const toolType = await db.toolType.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(toolType);
  } catch (error) {
    console.error('Error deleting tool type:', error);
    return NextResponse.json({ error: 'Error al eliminar tipo de herramienta' }, { status: 500 });
  }
}

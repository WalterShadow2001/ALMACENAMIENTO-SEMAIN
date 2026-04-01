import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('typeId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { active: true };

    if (typeId) {
      where.typeId = typeId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tools = await db.consumableTool.findMany({
      where,
      include: {
        type: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error listing tools:', error);
    return NextResponse.json({ error: 'Error al obtener herramientas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { name, typeId, description, quantity, minStock, averageLifeSpan, unit, location } = body;

    if (!name || !typeId) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const toolType = await db.toolType.findUnique({ where: { id: typeId } });
    if (!toolType) {
      return NextResponse.json({ error: 'Tipo de herramienta no encontrado' }, { status: 404 });
    }

    const tool = await db.consumableTool.create({
      data: {
        name,
        typeId,
        description: description || null,
        quantity: quantity ?? 0,
        minStock: minStock ?? 3,
        averageLifeSpan: averageLifeSpan ?? null,
        unit: unit ?? 'PIEZA',
        location: location || null,
      },
      include: { type: true },
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json({ error: 'Error al crear herramienta' }, { status: 500 });
  }
}

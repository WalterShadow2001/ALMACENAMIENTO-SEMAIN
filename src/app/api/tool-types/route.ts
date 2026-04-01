import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const toolTypes = await db.toolType.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { tools: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(toolTypes);
  } catch (error) {
    console.error('Error listing tool types:', error);
    return NextResponse.json({ error: 'Error al obtener tipos de herramienta' }, { status: 500 });
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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const existing = await db.toolType.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un tipo con ese nombre' }, { status: 409 });
    }

    const toolType = await db.toolType.create({
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(toolType, { status: 201 });
  } catch (error) {
    console.error('Error creating tool type:', error);
    return NextResponse.json({ error: 'Error al crear tipo de herramienta' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

const VALID_TYPES = ['MANDRIL', 'FIXTURA'];
const VALID_STATUSES = ['PENDIENTE', 'EN_DISENO', 'MATERIALES_APARTADOS', 'EN_CORTE', 'EN_PRODUCCION', 'PAUSADO', 'COMPLETADO'];
const VALID_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

// GET /api/projects — List all projects with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (type && VALID_TYPES.includes(type)) {
      where.type = type;
    }

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const projects = await db.project.findMany({
      where,
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
        _count: {
          select: { logs: true, toolUsages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/projects — Create project
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
    const { name, description, type, priority, wastePercent, dueDate, notes, components } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Tipo inválido. Debe ser: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Prioridad inválida. Debe ser: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    // Validate wastePercent
    let waste = wastePercent ?? 1.5;
    if (waste < 1.5 || waste > 4) {
      return NextResponse.json({ error: 'El porcentaje de desperdicio debe estar entre 1.5 y 4' }, { status: 400 });
    }

    // Validate components array
    if (components && !Array.isArray(components)) {
      return NextResponse.json({ error: 'components debe ser un arreglo' }, { status: 400 });
    }

    // Validate each component
    if (components) {
      for (const comp of components) {
        if (!comp.name || !comp.name.trim()) {
          return NextResponse.json({ error: 'Cada componente debe tener un nombre' }, { status: 400 });
        }
      }
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type,
        priority: priority || 'MEDIA',
        wastePercent: waste,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes?.trim() || null,
        components: components
          ? {
              create: components.map((comp: { name: string; description?: string; quantity?: number; materialTypeId?: string }) => ({
                name: comp.name.trim(),
                description: comp.description?.trim() || null,
                quantity: comp.quantity ?? 1,
                materialTypeId: comp.materialTypeId || null,
              })),
            }
          : undefined,
      },
      include: {
        components: {
          include: {
            materialType: true,
          },
        },
      },
    });

    // Create initial production log
    await db.productionLog.create({
      data: {
        projectId: project.id,
        userId: user.userId,
        action: 'CREAR',
        details: `Proyecto "${project.name}" creado`,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// POST /api/projects/[id]/components — Add component to project
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
      return NextResponse.json({ error: 'Sin permisos para agregar componentes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, quantity, materialTypeId } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del componente es obligatorio' }, { status: 400 });
    }

    // Validate quantity
    if (quantity !== undefined && (quantity < 1 || !Number.isInteger(quantity))) {
      return NextResponse.json({ error: 'La cantidad debe ser un número entero mayor o igual a 1' }, { status: 400 });
    }

    // Validate materialTypeId if provided
    if (materialTypeId) {
      const materialType = await db.materialType.findUnique({
        where: { id: materialTypeId },
      });
      if (!materialType) {
        return NextResponse.json({ error: 'Tipo de material no encontrado' }, { status: 400 });
      }
    }

    // Check project exists
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Create the component
    const component = await db.projectComponent.create({
      data: {
        projectId: id,
        name: name.trim(),
        description: description?.trim() || null,
        quantity: quantity ?? 1,
        materialTypeId: materialTypeId || null,
      },
      include: {
        materialType: true,
      },
    });

    // Create production log
    await db.productionLog.create({
      data: {
        projectId: id,
        userId: user.userId,
        action: 'AGREGAR_COMPONENTE',
        details: `Componente "${component.name}" agregado al proyecto`,
      },
    });

    return NextResponse.json({ data: component }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

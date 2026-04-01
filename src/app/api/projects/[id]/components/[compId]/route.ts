import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole } from '@/lib/auth';

// PUT /api/projects/[id]/components/[compId] — Update component
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json({ error: 'Sin permisos para editar componentes' }, { status: 403 });
    }

    const { id, compId } = await params;
    const body = await request.json();
    const { name, description, quantity, materialTypeId, status, notes } = body;

    // Check component exists and belongs to project
    const existing = await db.projectComponent.findFirst({
      where: { id: compId, projectId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Componente no encontrado' }, { status: 404 });
    }

    // Validate quantity if provided
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

    // Update component
    const component = await db.projectComponent.update({
      where: { id: compId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(quantity !== undefined && { quantity }),
        ...(materialTypeId !== undefined && { materialTypeId: materialTypeId || null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
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
        action: 'EDITAR_COMPONENTE',
        details: `Componente "${component.name}" actualizado`,
      },
    });

    return NextResponse.json({ data: component });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/components/[compId] — Delete component
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN', 'SUPERVISOR'])) {
      return NextResponse.json({ error: 'Sin permisos para eliminar componentes' }, { status: 403 });
    }

    const { id, compId } = await params;

    // Check component exists and belongs to project
    const existing = await db.projectComponent.findFirst({
      where: { id: compId, projectId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Componente no encontrado' }, { status: 404 });
    }

    // Delete the component
    await db.projectComponent.delete({
      where: { id: compId },
    });

    // Create production log
    await db.productionLog.create({
      data: {
        projectId: id,
        userId: user.userId,
        action: 'ELIMINAR_COMPONENTE',
        details: `Componente "${existing.name}" eliminado del proyecto`,
      },
    });

    return NextResponse.json({ message: 'Componente eliminado correctamente' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

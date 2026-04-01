import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity, projectId, notes } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    const tool = await db.consumableTool.findUnique({
      where: { id },
    });

    if (!tool || !tool.active) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    if (tool.quantity < quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${tool.quantity}` },
        { status: 400 }
      );
    }

    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }
    }

    const [usage, updatedTool] = await db.$transaction([
      db.toolUsage.create({
        data: {
          toolId: id,
          projectId: projectId || null,
          userId: user.userId,
          quantity,
          notes: notes || null,
        },
        include: {
          user: { select: { id: true, username: true, name: true } },
          project: { select: { id: true, name: true } },
          tool: { include: { type: true } },
        },
      }),
      db.consumableTool.update({
        where: { id },
        data: { quantity: { decrement: quantity } },
        include: { type: true },
      }),
    ]);

    return NextResponse.json({ usage, updatedTool }, { status: 201 });
  } catch (error) {
    console.error('Error recording tool usage:', error);
    return NextResponse.json({ error: 'Error al registrar uso de herramienta' }, { status: 500 });
  }
}

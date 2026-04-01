import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const [
      totalUsersResult,
      activeUsersResult,
      totalInventoryResult,
      lowStockItems,
      requisitionsByStatus,
      projectsByType,
      projectsByStatus,
      totalMaterialStock,
      totalSpecialMaterials,
      totalConsumableTools,
      lowStockTools,
      recentRequisitions,
      recentProjects,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Active users
      db.user.count({ where: { active: true } }),

      // Total inventory items
      db.inventoryItem.count({ where: { active: true } }),

      // Low stock items (quantity <= minStock)
      db.inventoryItem.findMany({
        where: { active: true, quantity: { lte: db.inventoryItem.fields.minStock } },
        select: { id: true, name: true, quantity: true, minStock: true, unit: true },
      }),

      // Requisitions grouped by status
      db.requisition.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Projects grouped by type
      db.project.groupBy({
        by: ['type'],
        _count: { type: true },
      }),

      // Projects grouped by status
      db.project.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Total material stock entries
      db.materialStock.count({ where: { active: true } }),

      // Total special materials
      db.specialMaterial.count({ where: { active: true } }),

      // Total consumable tools
      db.consumableTool.count({ where: { active: true } }),

      // Low stock tools (quantity <= minStock)
      db.consumableTool.findMany({
        where: { active: true, quantity: { lte: db.consumableTool.fields.minStock } },
        select: { id: true, name: true, quantity: true, minStock: true, unit: true },
      }),

      // Recent requisitions (last 5)
      db.requisition.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, username: true, name: true } },
          approvedBy: { select: { id: true, username: true, name: true } },
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),

      // Recent projects (last 5)
      db.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { components: true, logs: true } },
        },
      }),
    ]);

    // Format requisitions by status into a key-value map
    const totalRequisitionsByStatus: Record<string, number> = {};
    for (const r of requisitionsByStatus) {
      totalRequisitionsByStatus[r.status] = r._count.status;
    }

    // Format projects by type into a key-value map
    const totalProjectsByType: Record<string, number> = {};
    for (const p of projectsByType) {
      totalProjectsByType[p.type] = p._count.type;
    }

    // Format projects by status into a key-value map
    const totalProjectsByStatus: Record<string, number> = {};
    for (const p of projectsByStatus) {
      totalProjectsByStatus[p.status] = p._count.status;
    }

    return NextResponse.json({
      users: {
        total: totalUsersResult,
        active: activeUsersResult,
      },
      inventory: {
        total: totalInventoryResult,
        lowStockItems,
      },
      requisitions: {
        byStatus: totalRequisitionsByStatus,
        recent: recentRequisitions,
      },
      projects: {
        byType: totalProjectsByType,
        byStatus: totalProjectsByStatus,
        recent: recentProjects,
      },
      materials: {
        totalMaterialStock,
        totalSpecialMaterials,
      },
      tools: {
        totalConsumableTools,
        lowStockTools,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas del dashboard' }, { status: 500 });
  }
}

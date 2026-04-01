import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/material-stock/[id] - Get single stock item with reservations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stockItem = await db.materialStock.findUnique({
      where: { id },
      include: {
        type: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        reservations: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!stockItem) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(stockItem);
  } catch (error) {
    console.error("Error fetching stock item:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock item" },
      { status: 500 }
    );
  }
}

// PUT /api/material-stock/[id] - Update stock item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.materialStock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      shape,
      diameter,
      width,
      thickness,
      lengthTotal,
      lengthAvailable,
      location,
      weightPerMeter,
    } = body;

    // Validate shape if provided
    if (shape !== undefined) {
      const validShapes = ["REDONDA", "CUADRADA", "LAMINA", "TUBULAR"];
      if (!validShapes.includes(shape.trim().toUpperCase())) {
        return NextResponse.json(
          { error: `Invalid shape. Must be one of: ${validShapes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const stockItem = await db.materialStock.update({
      where: { id },
      data: {
        ...(shape !== undefined && { shape: shape.trim().toUpperCase() }),
        ...(diameter !== undefined && {
          diameter: parseFloat(diameter),
        }),
        ...(width !== undefined && { width: parseFloat(width) }),
        ...(thickness !== undefined && {
          thickness: parseFloat(thickness),
        }),
        ...(lengthTotal !== undefined && {
          lengthTotal: parseFloat(lengthTotal),
        }),
        ...(lengthAvailable !== undefined && {
          lengthAvailable: parseFloat(lengthAvailable),
        }),
        ...(location !== undefined && {
          location: location?.trim() || null,
        }),
        ...(weightPerMeter !== undefined && {
          weightPerMeter: parseFloat(weightPerMeter),
        }),
      },
      include: {
        type: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(stockItem);
  } catch (error) {
    console.error("Error updating stock item:", error);
    return NextResponse.json(
      { error: "Failed to update stock item" },
      { status: 500 }
    );
  }
}

// DELETE /api/material-stock/[id] - Soft delete stock item (ADMIN/SUPERVISOR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.materialStock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Stock item not found" },
        { status: 404 }
      );
    }

    // Check for active reservations
    const activeReservations = await db.materialReservation.count({
      where: {
        materialStockId: id,
        status: "ACTIVA",
      },
    });

    if (activeReservations > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete stock item with ${activeReservations} active reservation(s). Release reservations first.`,
        },
        { status: 409 }
      );
    }

    const stockItem = await db.materialStock.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(stockItem);
  } catch (error) {
    console.error("Error deleting stock item:", error);
    return NextResponse.json(
      { error: "Failed to delete stock item" },
      { status: 500 }
    );
  }
}

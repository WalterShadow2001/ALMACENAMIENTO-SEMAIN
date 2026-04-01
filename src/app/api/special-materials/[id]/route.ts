import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/special-materials/[id] - Get single special material
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const specialMaterial = await db.specialMaterial.findUnique({
      where: { id },
    });

    if (!specialMaterial) {
      return NextResponse.json(
        { error: "Special material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(specialMaterial);
  } catch (error) {
    console.error("Error fetching special material:", error);
    return NextResponse.json(
      { error: "Failed to fetch special material" },
      { status: 500 }
    );
  }
}

// PUT /api/special-materials/[id] - Update special material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.specialMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Special material not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, stockKg, minStockKg, unitCost, supplier } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
    }

    const specialMaterial = await db.specialMaterial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(stockKg !== undefined && { stockKg: parseFloat(stockKg) }),
        ...(minStockKg !== undefined && {
          minStockKg: parseFloat(minStockKg),
        }),
        ...(unitCost !== undefined && {
          unitCost: parseFloat(unitCost),
        }),
        ...(supplier !== undefined && {
          supplier: supplier?.trim() || null,
        }),
      },
    });

    return NextResponse.json(specialMaterial);
  } catch (error) {
    console.error("Error updating special material:", error);
    return NextResponse.json(
      { error: "Failed to update special material" },
      { status: 500 }
    );
  }
}

// DELETE /api/special-materials/[id] - Soft delete special material (ADMIN/SUPERVISOR only)
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

    const existing = await db.specialMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Special material not found" },
        { status: 404 }
      );
    }

    const specialMaterial = await db.specialMaterial.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(specialMaterial);
  } catch (error) {
    console.error("Error deleting special material:", error);
    return NextResponse.json(
      { error: "Failed to delete special material" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/materials/[id] - Get single material type with stocks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const material = await db.materialType.findUnique({
      where: { id },
      include: {
        stocks: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error fetching material:", error);
    return NextResponse.json(
      { error: "Failed to fetch material" },
      { status: 500 }
    );
  }
}

// PUT /api/materials/[id] - Update material type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.materialType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Material name cannot be empty" },
          { status: 400 }
        );
      }

      const duplicate = await db.materialType.findFirst({
        where: {
          name: name.trim(),
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Material type with this name already exists" },
          { status: 409 }
        );
      }
    }

    const material = await db.materialType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

// DELETE /api/materials/[id] - Soft delete material type (ADMIN/SUPERVISOR only)
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

    const existing = await db.materialType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    const material = await db.materialType.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}

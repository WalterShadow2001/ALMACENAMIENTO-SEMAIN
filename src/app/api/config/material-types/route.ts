import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/config/material-types - List material types (simplified for config)
export async function GET() {
  try {
    const materialTypes = await db.materialType.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(materialTypes);
  } catch (error) {
    console.error("Error fetching material types:", error);
    return NextResponse.json(
      { error: "Failed to fetch material types" },
      { status: 500 }
    );
  }
}

// POST /api/config/material-types - Create material type (ADMIN/SUPERVISOR only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Material type name is required" },
        { status: 400 }
      );
    }

    const existing = await db.materialType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Material type with this name already exists" },
        { status: 409 }
      );
    }

    const materialType = await db.materialType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(materialType, { status: 201 });
  } catch (error) {
    console.error("Error creating material type:", error);
    return NextResponse.json(
      { error: "Failed to create material type" },
      { status: 500 }
    );
  }
}

// PUT /api/config/material-types - Update material type (ADMIN/SUPERVISOR only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Material type ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.materialType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Material type name cannot be empty" },
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

    const materialType = await db.materialType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return NextResponse.json(materialType);
  } catch (error) {
    console.error("Error updating material type:", error);
    return NextResponse.json(
      { error: "Failed to update material type" },
      { status: 500 }
    );
  }
}

// DELETE /api/config/material-types - Soft delete material type (ADMIN/SUPERVISOR only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Material type ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.materialType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    const materialType = await db.materialType.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(materialType);
  } catch (error) {
    console.error("Error deleting material type:", error);
    return NextResponse.json(
      { error: "Failed to delete material type" },
      { status: 500 }
    );
  }
}

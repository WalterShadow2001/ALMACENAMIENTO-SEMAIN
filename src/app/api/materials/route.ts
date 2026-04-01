import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/materials - List all material types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") === "true";

    const materials = await db.materialType.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        _count: {
          select: { stocks: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

// POST /api/materials - Create a new material type (ADMIN/SUPERVISOR only)
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
        { error: "Material name is required" },
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

    const material = await db.materialType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}

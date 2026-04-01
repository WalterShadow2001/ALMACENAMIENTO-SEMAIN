import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/special-materials - List special materials
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get("active") !== "false";

    const specialMaterials = await db.specialMaterial.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(specialMaterials);
  } catch (error) {
    console.error("Error fetching special materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch special materials" },
      { status: 500 }
    );
  }
}

// POST /api/special-materials - Create a new special material (ADMIN/SUPERVISOR only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, stockKg, minStockKg, unitCost, supplier } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const specialMaterial = await db.specialMaterial.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        stockKg: stockKg !== undefined ? parseFloat(stockKg) : 0,
        minStockKg: minStockKg !== undefined ? parseFloat(minStockKg) : 5,
        unitCost: unitCost !== undefined ? parseFloat(unitCost) : null,
        supplier: supplier?.trim() || null,
      },
    });

    return NextResponse.json(specialMaterial, { status: 201 });
  } catch (error) {
    console.error("Error creating special material:", error);
    return NextResponse.json(
      { error: "Failed to create special material" },
      { status: 500 }
    );
  }
}

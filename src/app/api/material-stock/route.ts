import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/auth";

// GET /api/material-stock - List all material stock with type info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const typeId = searchParams.get("typeId");
    const shape = searchParams.get("shape");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { active: true };

    if (typeId) {
      where.typeId = typeId;
    }

    if (shape) {
      where.shape = shape;
    }

    if (search) {
      where.type = {
        name: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    const stockItems = await db.materialStock.findMany({
      where: Object.keys(where).length > 0 ? where : { active: true },
      include: {
        type: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stockItems);
  } catch (error) {
    console.error("Error fetching material stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch material stock" },
      { status: 500 }
    );
  }
}

// POST /api/material-stock - Create a new material stock item (ADMIN/SUPERVISOR only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasRole(user, ["ADMIN", "SUPERVISOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      typeId,
      shape,
      diameter,
      width,
      thickness,
      lengthTotal,
      lengthAvailable,
      location,
      weightPerMeter,
    } = body;

    if (!typeId) {
      return NextResponse.json(
        { error: "Material type ID is required" },
        { status: 400 }
      );
    }

    if (!shape || typeof shape !== "string" || shape.trim().length === 0) {
      return NextResponse.json(
        { error: "Shape is required" },
        { status: 400 }
      );
    }

    const validShapes = ["REDONDA", "CUADRADA", "LAMINA", "TUBULAR"];
    if (!validShapes.includes(shape.trim().toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid shape. Must be one of: ${validShapes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate material type exists
    const materialType = await db.materialType.findUnique({
      where: { id: typeId },
    });

    if (!materialType) {
      return NextResponse.json(
        { error: "Material type not found" },
        { status: 404 }
      );
    }

    const stock = await db.materialStock.create({
      data: {
        typeId,
        shape: shape.trim().toUpperCase(),
        diameter: diameter !== undefined ? parseFloat(diameter) : null,
        width: width !== undefined ? parseFloat(width) : null,
        thickness: thickness !== undefined ? parseFloat(thickness) : null,
        lengthTotal: lengthTotal !== undefined ? parseFloat(lengthTotal) : 0,
        lengthAvailable:
          lengthAvailable !== undefined ? parseFloat(lengthAvailable) : 0,
        location: location?.trim() || null,
        weightPerMeter:
          weightPerMeter !== undefined
            ? parseFloat(weightPerMeter)
            : null,
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

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    console.error("Error creating material stock:", error);
    return NextResponse.json(
      { error: "Failed to create material stock" },
      { status: 500 }
    );
  }
}

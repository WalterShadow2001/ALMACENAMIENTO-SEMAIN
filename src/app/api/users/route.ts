import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasRole, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sin permisos. Solo administradores.' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!hasRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sin permisos. Solo administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password y name son requeridos' },
        { status: 400 }
      );
    }

    const validRoles = ['ADMIN', 'SUPERVISOR', 'USUARIO'];
    const userRole = role || 'USUARIO';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

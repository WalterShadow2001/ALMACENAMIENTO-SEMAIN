import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie, JWTPayload } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact an administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create JWT token (20h expiry, set in createToken)
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    const token = await createToken(payload);

    // Calculate expiry time to match token (20 hours)
    const expiresAt = new Date(Date.now() + 20 * 60 * 60 * 1000);

    // Store session in DB
    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Set HTTP-only cookie with token
    const cookie = setAuthCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': `${cookie.name}=${cookie.value}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=${cookie.sameSite}; Path=${cookie.path}; Expires=${cookie.expires.toUTCString()}`,
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

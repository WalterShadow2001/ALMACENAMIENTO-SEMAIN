import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, clearAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Extract token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      // Verify the token is valid before cleaning up
      const payload = await verifyToken(token);

      if (payload) {
        // Delete session from DB by token
        await db.session.deleteMany({
          where: { token },
        });
      }
    }

    // Build the clear-cookie Set-Cookie header
    const cookie = clearAuthCookie();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      {
        status: 200,
        headers: {
          'Set-Cookie': `${cookie.name}=${cookie.value}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=${cookie.sameSite}; Path=${cookie.path}; Max-Age=${cookie.maxAge}`,
        },
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

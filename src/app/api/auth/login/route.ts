import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอก username และ password' },
        { status: 400 }
      );
    }

    const pool = await connectToDatabase();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signToken({
      userId: user.id.toString(),
      username: user.username,
    });

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });

    // Set httpOnly cookie for security
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { signToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${origin}/login?error=line_auth_failed`);
  }

  // Verify CSRF state
  const storedState = request.cookies.get('line_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  const returnTo = request.cookies.get('line_return_to')?.value || '/';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || origin}/api/auth/line/callback`;

  // Exchange code for access token
  let tokenData: any;
  try {
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });
    if (!tokenResponse.ok) throw new Error('Token exchange failed');
    tokenData = await tokenResponse.json();
  } catch {
    return NextResponse.redirect(`${origin}/login?error=token_exchange_failed`);
  }

  // Get LINE user profile
  let profile: any;
  try {
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) throw new Error('Profile fetch failed');
    profile = await profileResponse.json();
  } catch {
    return NextResponse.redirect(`${origin}/login?error=profile_fetch_failed`);
  }

  const { userId: lineUserId, displayName, pictureUrl } = profile;

  // Upsert user in database
  let dbUserId: number;
  let username: string;
  try {
    const pool = await connectToDatabase();

    const [existing] = await pool.query(
      'SELECT id, username FROM users WHERE line_user_id = ?',
      [lineUserId]
    ) as any[];

    if (existing.length > 0) {
      dbUserId = existing[0].id;
      username = existing[0].username;
      await pool.query(
        'UPDATE users SET display_name = ?, picture_url = ? WHERE id = ?',
        [displayName, pictureUrl || null, dbUserId]
      );
    } else {
      username = `line_${lineUserId}`;
      const [result] = await pool.query(
        'INSERT INTO users (username, password, line_user_id, display_name, picture_url) VALUES (?, ?, ?, ?, ?)',
        [username, '', lineUserId, displayName, pictureUrl || null]
      ) as any[];
      dbUserId = result.insertId;
    }
  } catch {
    return NextResponse.redirect(`${origin}/login?error=db_error`);
  }

  // Issue JWT and set cookie
  const token = signToken({ userId: dbUserId.toString(), username });

  const response = NextResponse.redirect(`${origin}${returnTo}`);
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  response.cookies.delete('line_oauth_state');
  response.cookies.delete('line_return_to');

  return response;
}

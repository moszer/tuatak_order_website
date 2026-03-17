import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mysql';
import { signMemberToken, setMemberCookieHeader } from '@/lib/memberJwt';

function generateMemberNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `TN${yyyy}${MM}${dd}${HH}${mm}${random}`;
}

function getValidTill(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/member?error=line_denied', request.url));
  }

  const clientId = process.env.LINE_CHANNEL_ID;
  const clientSecret = process.env.LINE_CHANNEL_SECRET;
  const redirectUri = `${origin}/api/auth/line/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/member?error=line_config', request.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      console.error('LINE token error:', await tokenRes.text());
      return NextResponse.redirect(new URL('/member?error=line_token', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get LINE profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(new URL('/member?error=line_profile', request.url));
    }

    const profile = await profileRes.json();
    const { userId: lineUid, displayName: lineName, pictureUrl: linePic } = profile;

    const pool = await connectToDatabase();

    // Look up member by lineUid
    const [members] = await pool.execute(
      'SELECT * FROM members WHERE lineUid = ?',
      [lineUid]
    ) as any;

    if (members && members.length > 0) {
      // Returning LINE user — update picture and log them in via JWT cookie
      const member = members[0];
      if (linePic) {
        await pool.execute(
          'UPDATE members SET linePictureUrl = ?, updatedAt = NOW() WHERE id = ?',
          [linePic, member.id]
        );
      }
      const token = signMemberToken({ memberId: member.id, phone: member.phone, name: member.name });
      const response = NextResponse.redirect(new URL('/member', request.url));
      response.headers.set('Set-Cookie', setMemberCookieHeader(token));
      return response;
    }

    // First-time LINE user — create account immediately, profile will be completed on /member
    const memberNumber = generateMemberNumber();
    const validTill = getValidTill();
    await pool.execute(
      `INSERT INTO members (phone, name, memberNumber, validTill, lineUid, linePictureUrl)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [null, lineName || 'LINE User', memberNumber, validTill, lineUid, linePic || null]
    );
    const [newRows] = await pool.execute(
      'SELECT * FROM members WHERE lineUid = ?',
      [lineUid]
    ) as any;
    const newMember = (newRows as any[])[0];
    const token = signMemberToken({ memberId: newMember.id, phone: '', name: newMember.name });
    const response = NextResponse.redirect(new URL('/member', request.url));
    response.headers.set('Set-Cookie', setMemberCookieHeader(token));
    return response;
  } catch (err) {
    console.error('LINE callback error:', err);
    return NextResponse.redirect(new URL('/member?error=line_error', request.url));
  }
}

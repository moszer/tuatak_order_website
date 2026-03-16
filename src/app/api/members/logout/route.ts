import { NextResponse } from 'next/server';
import { clearMemberCookieHeader } from '@/lib/memberJwt';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.set('Set-Cookie', clearMemberCookieHeader());
  return res;
}

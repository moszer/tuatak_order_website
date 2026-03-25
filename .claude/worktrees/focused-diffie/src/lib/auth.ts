import { NextRequest } from 'next/server';
import { getTokenFromCookie, verifyToken, JWTPayload } from './jwt';

export function getAuthToken(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  return getTokenFromCookie(cookieHeader);
}

export function verifyAuth(request: NextRequest): JWTPayload | null {
  const token = getAuthToken(request);
  if (!token) return null;
  
  return verifyToken(token);
}

export async function requireAuth(request: NextRequest): Promise<JWTPayload> {
  const payload = verifyAuth(request);
  if (!payload) {
    throw new Error('Unauthorized');
  }
  return payload;
}

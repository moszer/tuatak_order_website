import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const MEMBER_JWT_SECRET = process.env.MEMBER_JWT_SECRET || 'member_loyalty_secret_2024';
const COOKIE_NAME = 'member_token';

export interface MemberPayload {
  memberId: number;
  phone: string;
  name: string;
}

export function signMemberToken(payload: MemberPayload): string {
  return jwt.sign(payload, MEMBER_JWT_SECRET, { expiresIn: '30d' });
}

export function verifyMemberToken(token: string): MemberPayload | null {
  try {
    return jwt.verify(token, MEMBER_JWT_SECRET) as MemberPayload;
  } catch {
    return null;
  }
}

export async function getMemberFromCookie(): Promise<MemberPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyMemberToken(token);
}

export function setMemberCookieHeader(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`;
}

export function clearMemberCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

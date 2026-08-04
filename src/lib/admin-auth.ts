// Stateless site admin auth via signed cookie. No DB involvement.
// The cookie value is `randomToken.hmacHex` where hmac = HMAC-SHA256(secret, token).
import { randomToken } from './ids';

export const ADMIN_COOKIE = 'he_admin';

/** Sign a random token with the SITE_ADMIN_SECRET and return cookie value `token.hmac` */
export async function signAdminToken(secret: string): Promise<string> {
  const { createHmac } = await import('node:crypto');
  const token = randomToken(32);
  const hmac = createHmac('sha256', secret).update(token).digest('hex');
  return `${token}.${hmac}`;
}

/** Verify a cookie value `token.hmac` against the secret. Returns true if valid. */
export async function verifyAdminToken(cookieValue: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!cookieValue || !secret) return false;
  const dot = cookieValue.lastIndexOf('.');
  if (dot < 1) return false;
  const token = cookieValue.slice(0, dot);
  const hmac = cookieValue.slice(dot + 1);
  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', secret).update(token).digest('hex');
  // Constant-time compare
  if (hmac.length !== expected.length) return false;
  let match = 0;
  for (let i = 0; i < hmac.length; i++) match |= hmac.charCodeAt(i) ^ expected.charCodeAt(i);
  return match === 0;
}

/** Extract the admin cookie from a Request's Cookie header */
export function getAdminCookie(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === ADMIN_COOKIE) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
/** True when the request carries a valid site-admin cookie (used by admin APIs). */
export async function isSiteAdmin(req: Request): Promise<boolean> {
  return verifyAdminToken(getAdminCookie(req), process.env.SITE_ADMIN_SECRET);
}

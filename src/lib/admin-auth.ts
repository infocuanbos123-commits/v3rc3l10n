import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'metromovies_admin';
export const SESSION_SECONDS = 8 * 3600;
const equal = (a: string, b: string) => {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
};
export function adminConfigured() {
  return !!process.env.ADMIN_ACCESS_CODE && !!process.env.ADMIN_SESSION_SECRET;
}
export function checkAdminCode(code: unknown): boolean {
  return adminConfigured() && typeof code === 'string' && code.length <= 256 && equal(code,process.env.ADMIN_ACCESS_CODE!);
}
function signature(value: string) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(`${value}:${process.env.ADMIN_ACCESS_CODE}`).digest('base64url');
}
export function makeAdminSession(now = Date.now()) {
  if (!adminConfigured()) throw new Error('Admin belum dikonfigurasi.');
  const value = `${Math.floor(now/1000)+SESSION_SECONDS}.${randomBytes(16).toString('hex')}`;
  return `${value}.${signature(value)}`;
}
export function validAdminSession(token: string | undefined, now = Date.now()) {
  if (!adminConfigured() || !token || token.length > 200) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  return expires > Math.floor(now/1000) && expires <= Math.floor(now/1000)+SESSION_SECONDS && equal(parts[2], signature(`${parts[0]}.${parts[1]}`));
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

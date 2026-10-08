import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validAdminSession } from '@/lib/admin-auth';
import { SecretSettingsPanel } from '@/components/SecretSettingsPanel';
export const dynamic = 'force-dynamic';
export const metadata:Metadata = {title:'Secret Settings | MetroMovies',robots:{index:false,follow:false}};
export default async function SecretSettingsPage() {
  const jar = await cookies();
  return <SecretSettingsPanel initialAuthenticated={validAdminSession(jar.get(ADMIN_COOKIE)?.value)} />;
}

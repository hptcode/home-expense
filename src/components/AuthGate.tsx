'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Private app: bounce unauthenticated users to /login (except auth routes),
// and send logged-in users landing on "/" to the dashboard.
export default function AuthGate({ authed, children }: { authed: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authRoutes = ['/login', '/signup', '/invite', '/reset', '/admin/login'];
  useEffect(() => {
    if (authed && pathname === '/') { router.replace('/dashboard'); return; }
    if (!authed && !authRoutes.includes(pathname) && !pathname.startsWith('/admin')) { router.replace('/login'); }
  }, [authed, pathname, router]);
  return <>{children}</>;
}

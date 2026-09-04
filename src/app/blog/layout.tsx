import type { ReactNode } from 'react';
import { requireManagedPageAccess } from '@/lib/page-access';

export const dynamic = 'force-dynamic';

export default async function BlogLayout({ children }: { children: ReactNode }) {
    await requireManagedPageAccess('blog');
    return children;
}

import type { ReactNode } from 'react';
import { requireManagedPageAccess } from '@/lib/page-access';

export const dynamic = 'force-dynamic';

export default async function GalleryLayout({ children }: { children: ReactNode }) {
    await requireManagedPageAccess('gallery');
    return children;
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canAccessManagedPage, getManagedPageAccessSettings } from '@/lib/page-access';

export const dynamic = 'force-dynamic';

export async function GET() {
    const [pageAccess, session] = await Promise.all([
        getManagedPageAccessSettings(),
        auth().catch(() => null),
    ]);
    const isAdmin = Boolean(session?.user && ['OWNER', 'ADMIN'].includes(session.user.role));
    return NextResponse.json(
        { visible: canAccessManagedPage(pageAccess, 'store', isAdmin) },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
}

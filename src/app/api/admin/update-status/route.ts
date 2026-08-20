import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role || '')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const file = join(process.cwd(), 'tmp', 'update-status.json');
        if (!existsSync(file)) return NextResponse.json({ status: null });
        const status = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        return NextResponse.json({ status }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ status: null }, { headers: { 'Cache-Control': 'no-store' } });
    }
}

import { NextResponse } from 'next/server';
import { checkForPortfolioUpdate } from '@/app/admin/(protected)/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
    const result = await checkForPortfolioUpdate();
    return NextResponse.json(result, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        },
    });
}

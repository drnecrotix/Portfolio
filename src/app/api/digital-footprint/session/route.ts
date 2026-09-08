import { NextResponse } from 'next/server';
import { bearerToken, validOrigin } from '@/modules/digital-footprint/http';
import { revokeVerification } from '@/modules/digital-footprint/security';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
    if (!validOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    await revokeVerification(bearerToken(request));
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

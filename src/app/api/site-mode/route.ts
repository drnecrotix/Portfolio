import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveSiteMode } from '@/lib/site-mode';

export const dynamic = 'force-dynamic';

export async function GET() {
    const settings = await prisma.siteModeSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default' },
    });
    const effective = resolveSiteMode(settings);

    return NextResponse.json({
        mode: effective.mode,
        bypassAdmins: settings.bypassAdmins,
        title: settings.title,
        message: settings.message,
        countdownTarget: settings.countdownTarget,
        showSocials: settings.showSocials,
        showContact: settings.showContact,
    }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
}

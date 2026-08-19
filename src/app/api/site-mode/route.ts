import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const settings = await prisma.siteModeSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default' },
    });

    const now = new Date();
    const beforeStart = settings.startsAt && now < settings.startsAt;
    const afterEnd = settings.endsAt && now >= settings.endsAt;
    const effectiveMode = beforeStart || afterEnd ? 'NORMAL' : settings.mode;

    return NextResponse.json({
        mode: effectiveMode,
        bypassAdmins: settings.bypassAdmins,
        title: settings.title,
        message: settings.message,
        countdownTarget: settings.countdownTarget,
        showSocials: settings.showSocials,
        showContact: settings.showContact,
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}

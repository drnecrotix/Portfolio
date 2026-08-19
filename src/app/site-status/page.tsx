import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const defaults = {
    MAINTENANCE: {
        eyebrow: 'Maintenance',
        title: 'Temporarily offline',
        message: 'The portfolio is being updated. Please check back soon.',
    },
    COMING_SOON: {
        eyebrow: 'Coming soon',
        title: 'Something new is taking shape',
        message: 'The portfolio is not public yet, but it will be available soon.',
    },
    PRIVATE: {
        eyebrow: 'Private',
        title: 'Private access only',
        message: 'This portfolio is currently restricted to authorized administrators.',
    },
} as const;

export default async function SiteStatusPage() {
    const settings = await prisma.siteModeSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default' },
    });

    const now = new Date();
    const scheduledOut = (settings.startsAt && now < settings.startsAt) || (settings.endsAt && now >= settings.endsAt);
    const activeMode = scheduledOut ? 'NORMAL' : settings.mode;
    const mode = activeMode === 'MAINTENANCE' || activeMode === 'COMING_SOON' || activeMode === 'PRIVATE'
        ? activeMode
        : 'MAINTENANCE';
    const copy = defaults[mode];

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-4xl">
                <div className="border-t border-white/20 pt-8">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">{copy.eyebrow}</p>
                    <h1 className="mt-6 max-w-3xl text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[0.95]">
                        {settings.title || copy.title}
                    </h1>
                    <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed text-white/55">
                        {settings.message || copy.message}
                    </p>

                    {settings.countdownTarget && settings.countdownTarget > now && (
                        <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-white/40">
                            Target: {settings.countdownTarget.toLocaleString('en-GB', { timeZone: 'Europe/Sofia' })}
                        </p>
                    )}

                    <div className="mt-12 flex flex-wrap gap-3">
                        {settings.showContact && (
                            <Link href="/contact" className="rounded-full border border-white/20 px-5 py-3 text-sm hover:bg-white hover:text-black transition-colors">
                                Contact
                            </Link>
                        )}
                        <Link href="/admin/login" className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/40 hover:text-white transition-colors">
                            Admin
                        </Link>
                    </div>
                </div>

                <div className="mt-24 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.3em] text-white/25">
                    <span>Dr Necrotix</span>
                    <span>Bulgaria</span>
                </div>
            </div>
        </main>
    );
}

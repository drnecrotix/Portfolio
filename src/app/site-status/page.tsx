import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { resolveSiteMode } from '@/lib/site-mode';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
};

const defaults = {
    MAINTENANCE: { eyebrow: 'Maintenance', title: 'Temporarily offline', message: 'The portfolio is being updated. Please check back soon.' },
    COMING_SOON: { eyebrow: 'Coming soon', title: 'Something new is taking shape', message: 'The portfolio is not public yet, but it will be available soon.' },
    PRIVATE: { eyebrow: 'Private', title: 'Private access only', message: 'Enter the access password to continue.' },
} as const;

export default async function SiteStatusPage() {
    const settings = await prisma.siteModeSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
    const now = new Date();
    const effective = resolveSiteMode(settings, now);
    const mode = effective.mode === 'MAINTENANCE' || effective.mode === 'COMING_SOON' || effective.mode === 'PRIVATE' ? effective.mode : 'MAINTENANCE';
    const copy = defaults[mode];

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-4xl">
                <div className="border-t border-white/20 pt-8">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">{copy.eyebrow}</p>
                    <h1 className="mt-6 max-w-3xl text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[0.95]">{settings.title || copy.title}</h1>
                    <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed text-white/55">{settings.message || copy.message}</p>

                    {settings.countdownTarget && settings.countdownTarget > now && (
                        <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-white/40">Target: {settings.countdownTarget.toLocaleString('en-GB', { timeZone: 'Europe/Sofia' })}</p>
                    )}

                    {mode === 'PRIVATE' && settings.passwordHash && (
                        <form action="/api/site-mode/private-access" method="post" className="mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
                            <label className="sr-only" htmlFor="private-access-password">Access password</label>
                            <input id="private-access-password" name="password" type="password" required autoComplete="current-password" placeholder="Access password" className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/[0.04] px-5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/50" />
                            <button type="submit" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-85">Enter</button>
                        </form>
                    )}

                    <div className="mt-12 flex flex-wrap gap-3">
                        {settings.showContact && mode !== 'PRIVATE' && <Link href="/contact" className="rounded-full border border-white/20 px-5 py-3 text-sm hover:bg-white hover:text-black transition-colors">Contact</Link>}
                        <Link href="/admin/login" className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/40 hover:text-white transition-colors">Admin</Link>
                    </div>
                </div>

                <div className="mt-24 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.3em] text-white/25"><span>Dr Necrotix</span><span>Bulgaria</span></div>
            </div>
        </main>
    );
}

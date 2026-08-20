import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { defaultFooterSettings, normalizeFooterSettings } from '@/lib/footer-settings';
import { updateFooterSettings } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function FooterAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [raw, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { footerContent: true } }),
        searchParams,
    ]);
    const settings = normalizeFooterSettings(raw?.footerContent);
    const quickLinks = Array.from({ length: 6 }, (_, index) => settings.quickLinks[index] ?? { label: '', href: '' });
    const aboutLinks = Array.from({ length: 8 }, (_, index) => settings.aboutLinks[index] ?? { label: '', href: '' });
    const marquee = Array.from({ length: 6 }, (_, index) => settings.marquee[index] ?? defaultFooterSettings.marquee[index] ?? '');

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Footer settings saved and applied.' : undefined)} />
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="mt-2 text-4xl font-semibold">Footer & More info</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Edit every public value in the compact footer and fullscreen More info panel. Layout, spacing, animation, four-column structure and responsive behavior remain protected.</p>
                </div>
                <Link href="/" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Preview</Link>
            </div>

            <form action={updateFooterSettings} className="space-y-8">
                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <div className="md:col-span-2"><h3 className="text-lg font-semibold">Compact footer</h3><p className="mt-1 text-xs text-white/35">The compact bar keeps the original animation and glass styling.</p></div>
                    <label className="text-sm text-white/60">Animated name text<input name="compactName" defaultValue={settings.compactName} className={input} /></label>
                    <label className="text-sm text-white/60">Animated alternate text<input name="compactSecondary" defaultValue={settings.compactSecondary} className={input} /></label>
                    <label className="text-sm text-white/60">More button label<input name="moreLabel" defaultValue={settings.moreLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Large brand text<input name="brandText" defaultValue={settings.brandText} className={input} /></label>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="mb-5"><h3 className="text-lg font-semibold">Top marquee</h3><p className="mt-1 text-xs text-white/35">Six phrases repeat continuously using the existing animation.</p></div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {marquee.map((value, index) => <label key={index} className="text-sm text-white/60">Phrase {index + 1}<input name={`marquee${index}`} defaultValue={value} className={input} /></label>)}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="mb-5"><h3 className="text-lg font-semibold">Links column</h3><p className="mt-1 text-xs text-white/35">Up to six top-level links. Empty rows are ignored.</p></div>
                    <label className="mb-5 block max-w-sm text-sm text-white/60">Column heading<input name="linksHeading" defaultValue={settings.linksHeading} className={input} /></label>
                    <div className="space-y-3">
                        {quickLinks.map((link, index) => (
                            <div key={index} className="grid gap-3 md:grid-cols-[1fr_2fr]">
                                <input name={`quickLabel${index}`} defaultValue={link.label} placeholder={`Link ${index + 1} label`} className={input} />
                                <input name={`quickHref${index}`} defaultValue={link.href} placeholder="/page or https://..." className={input} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <div className="mb-5"><h3 className="text-lg font-semibold">About submenu</h3><p className="mt-1 text-xs text-white/35">The hover/click expansion animation stays protected; only its content changes.</p></div>
                    <label className="mb-5 block max-w-sm text-sm text-white/60">Menu label<input name="aboutLabel" defaultValue={settings.aboutLabel} className={input} /></label>
                    <div className="space-y-3">
                        {aboutLinks.map((link, index) => (
                            <div key={index} className="grid gap-3 md:grid-cols-[1fr_2fr]">
                                <input name={`aboutLabel${index}`} defaultValue={link.label} placeholder={`Submenu ${index + 1} label`} className={input} />
                                <input name={`aboutHref${index}`} defaultValue={link.href} placeholder="/page or https://..." className={input} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <div className="md:col-span-2"><h3 className="text-lg font-semibold">Social & contact</h3><p className="mt-1 text-xs text-white/35">Empty optional profiles are hidden automatically.</p></div>
                    <label className="text-sm text-white/60">Column heading<input name="socialsHeading" defaultValue={settings.socialsHeading} className={input} /></label>
                    <label className="text-sm text-white/60">Email<input name="email" type="email" defaultValue={settings.email} className={input} /></label>
                    <label className="text-sm text-white/60">GitHub<input name="githubUrl" defaultValue={settings.githubUrl} className={input} /></label>
                    <label className="text-sm text-white/60">LinkedIn<input name="linkedinUrl" defaultValue={settings.linkedinUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Instagram<input name="instagramUrl" defaultValue={settings.instagramUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Workspace / extra link<input name="workspaceUrl" defaultValue={settings.workspaceUrl} className={input} /></label>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <div className="md:col-span-2"><h3 className="text-lg font-semibold">Local time & edition</h3><p className="mt-1 text-xs text-white/35">The clock is calculated automatically from the selected IANA timezone.</p></div>
                    <label className="text-sm text-white/60">Local time heading<input name="localTimeHeading" defaultValue={settings.localTimeHeading} className={input} /></label>
                    <label className="text-sm text-white/60">Timezone<input name="timezone" defaultValue={settings.timezone} placeholder="Europe/Sofia" className={input} /></label>
                    <label className="text-sm text-white/60">Location text<input name="locationText" defaultValue={settings.locationText} className={input} /></label>
                    <label className="text-sm text-white/60">Location URL<input name="locationUrl" defaultValue={settings.locationUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Version heading<input name="versionHeading" defaultValue={settings.versionHeading} className={input} /></label>
                    <label className="text-sm text-white/60">Edition text<input name="editionText" defaultValue={settings.editionText} className={input} /></label>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save footer</button>
            </form>
        </div>
    );
}

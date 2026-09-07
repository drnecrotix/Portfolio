'use client';

import { useState } from 'react';
import { AtSign, Clock3, ExternalLink, Link2, Menu, PanelBottom, Rows3, Settings2 } from 'lucide-react';
import type { FooterLinkSetting, FooterSettings } from '@/lib/footer-settings';
import { defaultFooterSettings } from '@/lib/footer-settings';
import { updateFooterSettings } from '@/app/admin/(protected)/footer/actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.035]';
type SectionId = 'compact' | 'marquee' | 'navigation' | 'social' | 'regional';
type PreviewMode = 'compact' | 'more';

const sections = [
    { id: 'compact' as const, label: 'Compact bar', hint: 'Animated footer strip', icon: PanelBottom },
    { id: 'marquee' as const, label: 'Marquee', hint: 'Repeating phrases', icon: Rows3 },
    { id: 'navigation' as const, label: 'Navigation', hint: 'Links and About menu', icon: Link2 },
    { id: 'social' as const, label: 'Social', hint: 'Profiles and email', icon: AtSign },
    { id: 'regional' as const, label: 'Regional', hint: 'Time, location, edition', icon: Clock3 },
];

function fixedLinks(items: FooterLinkSetting[], count: number) {
    return Array.from({ length: count }, (_, index) => items[index] ?? { label: '', href: '' });
}

function fixedMarquee(items: string[]) {
    return Array.from({ length: 6 }, (_, index) => items[index] ?? defaultFooterSettings.marquee[index] ?? '');
}

function safeTime(timezone: string) {
    try {
        return new Intl.DateTimeFormat('en-GB', { timeZone: timezone || 'Europe/Sofia', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    } catch {
        return '--:--';
    }
}

export function FooterSettingsWorkbench({ initialSettings }: { initialSettings: FooterSettings }) {
    const [active, setActive] = useState<SectionId>('compact');
    const [previewMode, setPreviewMode] = useState<PreviewMode>('compact');
    const [settings, setSettings] = useState<FooterSettings>({
        ...initialSettings,
        marquee: fixedMarquee(initialSettings.marquee),
        quickLinks: fixedLinks(initialSettings.quickLinks, 6),
        aboutLinks: fixedLinks(initialSettings.aboutLinks, 8),
    });

    const set = <K extends keyof FooterSettings,>(key: K, value: FooterSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    const setLink = (key: 'quickLinks' | 'aboutLinks', index: number, patch: Partial<FooterLinkSetting>) => setSettings((current) => ({
        ...current,
        [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
    const setPhrase = (index: number, value: string) => setSettings((current) => ({ ...current, marquee: current.marquee.map((item, itemIndex) => itemIndex === index ? value : item) }));

    return (
        <form action={updateFooterSettings}>
            <input type="hidden" name="compactName" value={settings.compactName} />
            <input type="hidden" name="compactSecondary" value={settings.compactSecondary} />
            <input type="hidden" name="moreLabel" value={settings.moreLabel} />
            <input type="hidden" name="brandText" value={settings.brandText} />
            <input type="hidden" name="linksHeading" value={settings.linksHeading} />
            <input type="hidden" name="aboutLabel" value={settings.aboutLabel} />
            <input type="hidden" name="socialsHeading" value={settings.socialsHeading} />
            <input type="hidden" name="email" value={settings.email} />
            <input type="hidden" name="githubUrl" value={settings.githubUrl} />
            <input type="hidden" name="linkedinUrl" value={settings.linkedinUrl} />
            <input type="hidden" name="instagramUrl" value={settings.instagramUrl} />
            <input type="hidden" name="workspaceUrl" value={settings.workspaceUrl} />
            <input type="hidden" name="localTimeHeading" value={settings.localTimeHeading} />
            <input type="hidden" name="timezone" value={settings.timezone} />
            <input type="hidden" name="locationText" value={settings.locationText} />
            <input type="hidden" name="locationUrl" value={settings.locationUrl} />
            <input type="hidden" name="versionHeading" value={settings.versionHeading} />
            <input type="hidden" name="editionText" value={settings.editionText} />
            {settings.marquee.map((value, index) => <input key={`m-${index}`} type="hidden" name={`marquee${index}`} value={value} />)}
            {settings.quickLinks.map((link, index) => <span key={`q-${index}`}><input type="hidden" name={`quickLabel${index}`} value={link.label} /><input type="hidden" name={`quickHref${index}`} value={link.href} /></span>)}
            {settings.aboutLinks.map((link, index) => <span key={`a-${index}`}><input type="hidden" name={`aboutLabel${index}`} value={link.label} /><input type="hidden" name={`aboutHref${index}`} value={link.href} /></span>)}

            <div className="grid min-w-0 gap-5 xl:grid-cols-[190px_minmax(0,1fr)_390px]">
                <nav className="xl:sticky xl:top-5 xl:self-start" aria-label="Footer settings sections">
                    <div className="flex gap-1 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
                        {sections.map((item) => {
                            const Icon = item.icon;
                            const selected = active === item.id;
                            return (
                                <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`flex min-w-[155px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition xl:w-full xl:min-w-0 ${selected ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.045] hover:text-white'}`}>
                                    <span className={`grid size-8 place-items-center rounded-lg border ${selected ? 'border-black/10 bg-black/[0.04]' : 'border-white/[0.07]'}`}><Icon className="size-4" /></span>
                                    <span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.label}</span><span className={`mt-0.5 hidden truncate text-[10px] xl:block ${selected ? 'text-black/50' : 'text-white/25'}`}>{item.hint}</span></span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.018] p-5 sm:p-6">
                    {active === 'compact' ? (
                        <section>
                            <div className="mb-6"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><PanelBottom className="size-3.5" /> Compact footer</div><h3 className="mt-2 text-xl font-semibold">Bottom strip</h3><p className="mt-1 text-xs leading-5 text-white/35">Edit the animated compact footer text and the More info trigger. Layout and motion remain protected.</p></div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-xs text-white/45">Animated name text<input value={settings.compactName} onChange={(event) => set('compactName', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Animated alternate text<input value={settings.compactSecondary} onChange={(event) => set('compactSecondary', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">More button label<input value={settings.moreLabel} onChange={(event) => set('moreLabel', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Large brand text<input value={settings.brandText} onChange={(event) => set('brandText', event.target.value)} className={input} /></label>
                            </div>
                        </section>
                    ) : null}

                    {active === 'marquee' ? (
                        <section>
                            <div className="mb-6"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><Rows3 className="size-3.5" /> Top marquee</div><h3 className="mt-2 text-xl font-semibold">Repeating phrases</h3><p className="mt-1 text-xs leading-5 text-white/35">Six phrases feed the continuous marquee above the More info content.</p></div>
                            <div className="grid gap-4 md:grid-cols-2">{settings.marquee.map((value, index) => <label key={index} className="text-xs text-white/45">Phrase {index + 1}<input value={value} onChange={(event) => setPhrase(index, event.target.value)} className={input} /></label>)}</div>
                        </section>
                    ) : null}

                    {active === 'navigation' ? (
                        <section>
                            <div className="mb-6"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><Menu className="size-3.5" /> Footer navigation</div><h3 className="mt-2 text-xl font-semibold">Links and About</h3><p className="mt-1 text-xs leading-5 text-white/35">Manage both columns in one workspace. Empty pairs are ignored when saved.</p></div>
                            <label className="block max-w-sm text-xs text-white/45">Links heading<input value={settings.linksHeading} onChange={(event) => set('linksHeading', event.target.value)} className={input} /></label>
                            <div className="mt-4 space-y-2">{settings.quickLinks.map((link, index) => <div key={index} className="grid gap-2 md:grid-cols-[0.8fr_1.2fr]"><input value={link.label} onChange={(event) => setLink('quickLinks', index, { label: event.target.value })} placeholder={`Link ${index + 1}`} className={input} /><input value={link.href} onChange={(event) => setLink('quickLinks', index, { href: event.target.value })} placeholder="/page or https://..." className={input} /></div>)}</div>
                            <div className="my-7 border-t border-white/[0.07]" />
                            <label className="block max-w-sm text-xs text-white/45">About menu label<input value={settings.aboutLabel} onChange={(event) => set('aboutLabel', event.target.value)} className={input} /></label>
                            <div className="mt-4 space-y-2">{settings.aboutLinks.map((link, index) => <div key={index} className="grid gap-2 md:grid-cols-[0.8fr_1.2fr]"><input value={link.label} onChange={(event) => setLink('aboutLinks', index, { label: event.target.value })} placeholder={`About ${index + 1}`} className={input} /><input value={link.href} onChange={(event) => setLink('aboutLinks', index, { href: event.target.value })} placeholder="/page or https://..." className={input} /></div>)}</div>
                        </section>
                    ) : null}

                    {active === 'social' ? (
                        <section>
                            <div className="mb-6"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><AtSign className="size-3.5" /> Social and contact</div><h3 className="mt-2 text-xl font-semibold">Public connections</h3><p className="mt-1 text-xs leading-5 text-white/35">Optional empty profiles stay hidden in the public footer.</p></div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-xs text-white/45">Column heading<input value={settings.socialsHeading} onChange={(event) => set('socialsHeading', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Email<input type="email" value={settings.email} onChange={(event) => set('email', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">GitHub<input value={settings.githubUrl} onChange={(event) => set('githubUrl', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">LinkedIn<input value={settings.linkedinUrl} onChange={(event) => set('linkedinUrl', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Instagram<input value={settings.instagramUrl} onChange={(event) => set('instagramUrl', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Workspace / extra link<input value={settings.workspaceUrl} onChange={(event) => set('workspaceUrl', event.target.value)} className={input} /></label>
                            </div>
                        </section>
                    ) : null}

                    {active === 'regional' ? (
                        <section>
                            <div className="mb-6"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><Clock3 className="size-3.5" /> Regional and edition</div><h3 className="mt-2 text-xl font-semibold">Local time and release text</h3><p className="mt-1 text-xs leading-5 text-white/35">The clock uses the selected IANA timezone. Location and edition text are public footer content.</p></div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="text-xs text-white/45">Local time heading<input value={settings.localTimeHeading} onChange={(event) => set('localTimeHeading', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Timezone<input value={settings.timezone} onChange={(event) => set('timezone', event.target.value)} placeholder="Europe/Sofia" className={input} /></label>
                                <label className="text-xs text-white/45">Location text<input value={settings.locationText} onChange={(event) => set('locationText', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Location URL<input value={settings.locationUrl} onChange={(event) => set('locationUrl', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Version heading<input value={settings.versionHeading} onChange={(event) => set('versionHeading', event.target.value)} className={input} /></label>
                                <label className="text-xs text-white/45">Edition text<input value={settings.editionText} onChange={(event) => set('editionText', event.target.value)} className={input} /></label>
                            </div>
                        </section>
                    ) : null}

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4"><span className="text-[10px] text-white/30">Live preview is local until saved.</span><div className="flex gap-2"><a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/55 transition hover:text-white">Open site <ExternalLink className="size-3.5" /></a><button className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">Save footer</button></div></div>
                </div>

                <aside className="xl:sticky xl:top-5 xl:self-start">
                    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080808] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.95)]">
                        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                            <div><p className="font-mono text-[8px] uppercase tracking-[0.26em] text-white/25">Live preview</p><p className="mt-1 text-xs font-semibold text-white/80">Footer</p></div>
                            <div className="flex rounded-lg border border-white/[0.07] bg-black/30 p-1">
                                <button type="button" onClick={() => setPreviewMode('compact')} className={`rounded-md px-2.5 py-1.5 text-[9px] ${previewMode === 'compact' ? 'bg-white text-black' : 'text-white/35'}`}>Compact</button>
                                <button type="button" onClick={() => setPreviewMode('more')} className={`rounded-md px-2.5 py-1.5 text-[9px] ${previewMode === 'more' ? 'bg-white text-black' : 'text-white/35'}`}>More info</button>
                            </div>
                        </div>

                        {previewMode === 'compact' ? (
                            <div className="p-4">
                                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-4">
                                    <div className="flex items-center justify-between gap-4"><span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">© 2026 {settings.compactName}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] text-white/55">{settings.moreLabel} ↑</span></div>
                                    <div className="mt-3 border-t border-white/[0.06] pt-3 text-[9px] text-white/28">Alternate animation: {settings.compactSecondary}</div>
                                </div>
                                <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.018] px-3 py-2.5"><div className="flex gap-5 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.14em] text-white/28">{settings.marquee.filter(Boolean).slice(0, 4).map((phrase, index) => <span key={index}>{phrase}</span>)}</div></div>
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.018] p-4">
                                    <p className="text-3xl font-black tracking-[-0.06em] text-white/90">{settings.brandText}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-4">
                                        <div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">{settings.linksHeading}</p><div className="mt-2 space-y-1.5">{settings.quickLinks.filter((link) => link.label).slice(0, 4).map((link, index) => <p key={index} className="truncate text-[10px] text-white/58">{link.label}</p>)}</div></div>
                                        <div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">{settings.aboutLabel}</p><div className="mt-2 space-y-1.5">{settings.aboutLinks.filter((link) => link.label).slice(0, 4).map((link, index) => <p key={index} className="truncate text-[10px] text-white/58">{link.label}</p>)}</div></div>
                                        <div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">{settings.socialsHeading}</p><p className="mt-2 truncate text-[10px] text-white/58">{settings.email || 'Social profiles'}</p></div>
                                        <div><p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/25">{settings.localTimeHeading}</p><p className="mt-2 text-xl font-semibold text-white/80">{safeTime(settings.timezone)}</p><p className="mt-1 text-[9px] text-white/30">{settings.locationText}</p></div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">{settings.versionHeading}</span><span className="text-[9px] text-white/40">{settings.editionText}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </form>
    );
}

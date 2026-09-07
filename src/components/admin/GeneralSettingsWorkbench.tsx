'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
    AtSign,
    Check,
    Clock3,
    ExternalLink,
    Eye,
    EyeOff,
    Globe2,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    MessageCircle,
    MonitorCog,
    Music2,
    Palette,
    Settings2,
    ShieldCheck,
    Smartphone,
    SunMoon,
} from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import type { GeneralSiteSettings } from '@/lib/site-settings';
import { updateGeneralSettings, updatePageAccessSettings } from '@/app/admin/(protected)/settings/actions';

type SectionId = 'identity' | 'appearance' | 'access' | 'contact' | 'social' | 'regional';
type AccessKey = 'wiki' | 'blog' | 'gallery' | 'store';
type AccessValue = 'PUBLIC' | 'ADMIN_ONLY' | 'DISABLED';
type AccessSettings = Record<AccessKey, AccessValue>;

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25 focus:bg-white/[0.035]';

const sections: Array<{ id: SectionId; label: string; hint: string; icon: typeof Settings2 }> = [
    { id: 'identity', label: 'Identity', hint: 'Name, description, favicon', icon: Globe2 },
    { id: 'appearance', label: 'Appearance', hint: 'Theme and accent', icon: Palette },
    { id: 'access', label: 'Page access', hint: 'Public route availability', icon: ShieldCheck },
    { id: 'contact', label: 'Contact', hint: 'Public and delivery details', icon: Mail },
    { id: 'social', label: 'Social', hint: 'Connected public profiles', icon: AtSign },
    { id: 'regional', label: 'Regional', hint: 'Locale and timezone', icon: Clock3 },
];

const accessMeta: Record<AccessKey, { title: string; path: string; description: string }> = {
    wiki: { title: 'Wiki', path: '/wiki', description: 'Wiki index, articles and FAQ pages.' },
    blog: { title: 'Blog', path: '/blog', description: 'Journal archive and public publications.' },
    gallery: { title: 'Gallery', path: '/gallery', description: 'Gallery index and individual works.' },
    store: { title: 'Store', path: '/store', description: 'Catalog, product pages and checkout entry points.' },
};

const accessOptions: Array<{ value: AccessValue; label: string; icon: typeof Eye }> = [
    { value: 'PUBLIC', label: 'Public', icon: Eye },
    { value: 'ADMIN_ONLY', label: 'Admin only', icon: ShieldCheck },
    { value: 'DISABLED', label: 'Off', icon: EyeOff },
];

function normalizeAccent(value: string) {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#d1ff4d';
}

function safeLocalTime(timezone: string, locale: string) {
    try {
        return new Intl.DateTimeFormat(locale || 'en', {
            timeZone: timezone || 'Europe/Sofia',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'short',
        }).format(new Date());
    } catch {
        return 'Timezone preview unavailable';
    }
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="border-b border-white/[0.07] pb-8 last:border-b-0 last:pb-0">
            <div className="mb-5">
                <h3 className="text-base font-semibold text-white/90">{title}</h3>
                {description ? <p className="mt-1 max-w-2xl text-xs leading-5 text-white/35">{description}</p> : null}
            </div>
            {children}
        </section>
    );
}

function SettingsRail({ active, onChange }: { active: SectionId; onChange: (id: SectionId) => void }) {
    return (
        <nav aria-label="General settings sections" className="min-w-0">
            <div className="flex gap-1 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
                {sections.map((section) => {
                    const Icon = section.icon;
                    const selected = active === section.id;
                    return (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => onChange(section.id)}
                            className={`group flex min-w-[150px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition xl:w-full xl:min-w-0 ${selected ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.045] hover:text-white'}`}
                        >
                            <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${selected ? 'border-black/10 bg-black/[0.04]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                                <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold">{section.label}</span>
                                <span className={`mt-0.5 hidden truncate text-[10px] xl:block ${selected ? 'text-black/50' : 'text-white/25'}`}>{section.hint}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

function PreviewFrame({ settings, access, active }: { settings: GeneralSiteSettings; access: AccessSettings; active: SectionId }) {
    const accent = normalizeAccent(settings.accentColor);
    const dark = settings.defaultTheme === 'dark';
    const socials = [
        ['GitHub', settings.socialLinks.github],
        ['Instagram', settings.socialLinks.instagram],
        ['LinkedIn', settings.socialLinks.linkedin],
        ['X', settings.socialLinks.twitter],
        ['Discord', settings.socialLinks.discord],
        ['Spotify', settings.socialLinks.spotify],
    ].filter(([, value]) => Boolean(value));

    const previewStyle = { '--preview-accent': accent } as CSSProperties;

    return (
        <aside className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090909] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.95)]" style={previewStyle}>
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/30">Live preview</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">{sections.find((item) => item.id === active)?.label}</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.055] px-2 py-1 text-[9px] text-emerald-200/70">
                    <span className="size-1.5 rounded-full bg-emerald-300" /> Live
                </span>
            </div>

            <div className="p-4">
                {active === 'identity' ? (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]">
                        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                            <span className="size-2 rounded-full bg-white/15" />
                            <span className="size-2 rounded-full bg-white/10" />
                            <span className="size-2 rounded-full bg-white/10" />
                            <span className="ml-2 truncate font-mono text-[8px] text-white/25">necrotixlab.com</span>
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
                                    {settings.faviconUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={settings.faviconUrl} alt="Favicon preview" className="size-8 object-contain" />
                                    ) : <Globe2 className="size-5 text-white/35" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-white">{settings.siteName || 'Untitled site'}</p>
                                    <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-white/38">{settings.siteDescription || 'No site description yet.'}</p>
                                </div>
                            </div>
                            <div className="mt-5 h-1 w-14 rounded-full" style={{ background: accent }} />
                        </div>
                    </div>
                ) : null}

                {active === 'appearance' ? (
                    <div className={`overflow-hidden rounded-2xl border ${dark ? 'border-white/10 bg-black text-white' : 'border-black/10 bg-[#f4f4f1] text-black'}`}>
                        <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? 'border-white/10' : 'border-black/10'}`}>
                            <span className="text-xs font-semibold">{settings.siteName}</span>
                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full" style={{ background: accent }} />
                                <SunMoon className="size-3.5 opacity-50" />
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="font-mono text-[8px] uppercase tracking-[0.25em] opacity-40">Theme preview</p>
                            <h4 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Visual identity</h4>
                            <p className="mt-2 max-w-[240px] text-[11px] leading-5 opacity-45">The public interface uses this default theme and accent when no visitor preference exists.</p>
                            <div className="mt-5 flex gap-2">
                                <span className="rounded-lg px-3 py-1.5 text-[9px] font-semibold text-black" style={{ background: accent }}>Accent</span>
                                <span className={`rounded-lg border px-3 py-1.5 text-[9px] ${dark ? 'border-white/10' : 'border-black/10'}`}>{settings.allowDayMode ? 'Theme toggle on' : 'Theme locked'}</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {active === 'access' ? (
                    <div className="space-y-2">
                        {(Object.keys(accessMeta) as AccessKey[]).map((key) => {
                            const status = access[key];
                            const tone = status === 'PUBLIC' ? 'text-emerald-200 border-emerald-400/15 bg-emerald-400/[0.05]' : status === 'ADMIN_ONLY' ? 'text-amber-100 border-amber-300/15 bg-amber-300/[0.05]' : 'text-red-200 border-red-400/15 bg-red-400/[0.05]';
                            return (
                                <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                                    <div>
                                        <p className="text-xs font-semibold text-white/80">{accessMeta[key].title}</p>
                                        <p className="mt-0.5 font-mono text-[8px] text-white/25">{accessMeta[key].path}</p>
                                    </div>
                                    <span className={`rounded-full border px-2 py-1 text-[8px] uppercase tracking-[0.14em] ${tone}`}>{status === 'PUBLIC' ? 'public' : status === 'ADMIN_ONLY' ? 'admin' : 'off'}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {active === 'contact' ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">Public contact</p>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3"><Mail className="size-4 text-white/30" /><span className="truncate text-xs text-white/70">{settings.contactDetails.email || 'No public email'}</span></div>
                            <div className="flex items-center gap-3"><Smartphone className="size-4 text-white/30" /><span className="truncate text-xs text-white/70">{settings.contactDetails.phone || 'No phone'}</span></div>
                            <div className="flex items-center gap-3"><MapPin className="size-4 text-white/30" /><span className="truncate text-xs text-white/70">{settings.contactDetails.location || 'No location'}</span></div>
                            <div className="flex items-center gap-3"><ExternalLink className="size-4 text-white/30" /><span className="truncate text-xs text-white/70">{settings.contactDetails.website || 'No website'}</span></div>
                        </div>
                        <div className="mt-4 border-t border-white/[0.07] pt-3 text-[9px] text-white/28">Form recipient: {settings.contactDetails.formRecipientEmail || settings.contactDetails.email || 'EMAIL_USER fallback'}</div>
                    </div>
                ) : null}

                {active === 'social' ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">Visible profiles</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {socials.length ? socials.map(([name]) => (
                                <div key={name} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-[10px] text-white/65">
                                    <span className="size-1.5 rounded-full" style={{ background: accent }} />
                                    <span>{name}</span>
                                </div>
                            )) : <p className="col-span-2 py-8 text-center text-xs text-white/30">No public social profiles.</p>}
                        </div>
                    </div>
                ) : null}

                {active === 'regional' ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
                        <Clock3 className="mx-auto size-5 text-white/35" />
                        <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{safeLocalTime(settings.timezone, settings.locale)}</p>
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">{settings.timezone}</p>
                        <div className="mt-5 flex justify-center gap-2">
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/45">{settings.locale}</span>
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/45">IANA timezone</span>
                        </div>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}

export function GeneralSettingsWorkbench({ initialSettings, initialAccess }: { initialSettings: GeneralSiteSettings; initialAccess: AccessSettings }) {
    const [active, setActive] = useState<SectionId>('identity');
    const [settings, setSettings] = useState(initialSettings);
    const [access, setAccess] = useState(initialAccess);
    const accent = normalizeAccent(settings.accentColor);

    const setTop = <K extends keyof GeneralSiteSettings,>(key: K, value: GeneralSiteSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    const setContact = <K extends keyof GeneralSiteSettings['contactDetails'],>(key: K, value: GeneralSiteSettings['contactDetails'][K]) => setSettings((current) => ({ ...current, contactDetails: { ...current.contactDetails, [key]: value } }));
    const setSocial = <K extends keyof GeneralSiteSettings['socialLinks'],>(key: K, value: GeneralSiteSettings['socialLinks'][K]) => setSettings((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }));

    const configuredSocials = useMemo(() => Object.values(settings.socialLinks).filter(Boolean).length, [settings.socialLinks]);

    const hiddenGeneralFields = (
        <>
            <input type="hidden" name="siteName" value={settings.siteName} />
            <input type="hidden" name="siteDescription" value={settings.siteDescription} />
            <input type="hidden" name="faviconUrl" value={settings.faviconUrl} />
            <input type="hidden" name="defaultTheme" value={settings.defaultTheme} />
            {settings.allowDayMode ? <input type="hidden" name="allowDayMode" value="on" /> : null}
            <input type="hidden" name="accentColor" value={settings.accentColor} />
            <input type="hidden" name="locale" value={settings.locale} />
            <input type="hidden" name="timezone" value={settings.timezone} />
            <input type="hidden" name="email" value={settings.contactDetails.email} />
            <input type="hidden" name="formRecipientEmail" value={settings.contactDetails.formRecipientEmail} />
            <input type="hidden" name="phone" value={settings.contactDetails.phone} />
            <input type="hidden" name="location" value={settings.contactDetails.location} />
            <input type="hidden" name="website" value={settings.contactDetails.website} />
            <input type="hidden" name="github" value={settings.socialLinks.github} />
            <input type="hidden" name="instagram" value={settings.socialLinks.instagram} />
            <input type="hidden" name="linkedin" value={settings.socialLinks.linkedin} />
            <input type="hidden" name="twitter" value={settings.socialLinks.twitter} />
            <input type="hidden" name="discord" value={settings.socialLinks.discord} />
            <input type="hidden" name="spotify" value={settings.socialLinks.spotify} />
        </>
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/30"><Settings2 className="size-3.5" /> Settings / General</div>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-white">Site configuration</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                    <span>{configuredSocials} socials</span><span>·</span><span>{settings.defaultTheme === 'dark' ? 'Night' : 'Day'} default</span>
                </div>
            </div>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[190px_minmax(0,1fr)_340px]">
                <div className="xl:sticky xl:top-5 xl:self-start">
                    <SettingsRail active={active} onChange={setActive} />
                </div>

                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.018]">
                    {active === 'access' ? (
                        <form action={updatePageAccessSettings} className="p-5 sm:p-6">
                            {(Object.keys(access) as AccessKey[]).map((key) => <input key={key} type="hidden" name={`${key}Access`} value={access[key]} />)}
                            <Panel title="Page availability" description="Choose how each public section behaves. These controls affect the entire route family, not only the index page.">
                                <div className="space-y-3">
                                    {(Object.keys(accessMeta) as AccessKey[]).map((key) => (
                                        <div key={key} className="rounded-xl border border-white/[0.07] bg-black/15 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2"><span className="text-sm font-semibold text-white/85">{accessMeta[key].title}</span><span className="font-mono text-[9px] text-white/25">{accessMeta[key].path}</span></div>
                                                    <p className="mt-1 text-xs leading-5 text-white/32">{accessMeta[key].description}</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
                                                    {accessOptions.map((option) => {
                                                        const Icon = option.icon;
                                                        const selected = access[key] === option.value;
                                                        return (
                                                            <button key={option.value} type="button" onClick={() => setAccess((current) => ({ ...current, [key]: option.value }))} className={`flex min-w-[84px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] transition ${selected ? 'bg-white text-black' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'}`}>
                                                                <Icon className="size-3.5" /> {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-5 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] px-4 py-3 text-xs leading-5 text-amber-100/55">Admin-only and disabled sections are removed from the public sitemap. Existing Store download grants remain independent.</div>
                            </Panel>
                            <div className="mt-6 flex justify-end"><button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Save page access</button></div>
                        </form>
                    ) : (
                        <form action={updateGeneralSettings} className="p-5 sm:p-6">
                            {hiddenGeneralFields}

                            {active === 'identity' ? (
                                <Panel title="Public identity" description="Core metadata used by the public layout, metadata envelope and browser identity.">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="text-xs text-white/45 md:col-span-2">Site name<input value={settings.siteName} onChange={(event) => setTop('siteName', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45 md:col-span-2">Site description<textarea rows={3} value={settings.siteDescription} onChange={(event) => setTop('siteDescription', event.target.value)} className={input} /></label>
                                        <div className="md:col-span-2">
                                            <MediaPicker value={settings.faviconUrl} onChange={(value) => setTop('faviconUrl', value)} label="Favicon" initialKind="image" lockKind />
                                            <p className="mt-2 text-[10px] leading-4 text-white/25">Square PNG, WebP, ICO or SVG. The default mark is used when empty.</p>
                                        </div>
                                    </div>
                                </Panel>
                            ) : null}

                            {active === 'appearance' ? (
                                <Panel title="Appearance defaults" description="These values initialize the public theme when the visitor has no saved preference.">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {(['dark', 'light'] as const).map((theme) => {
                                            const selected = settings.defaultTheme === theme;
                                            return (
                                                <button key={theme} type="button" onClick={() => setTop('defaultTheme', theme)} className={`overflow-hidden rounded-2xl border text-left transition ${selected ? 'border-white/35 bg-white/[0.06]' : 'border-white/[0.08] hover:border-white/15'}`}>
                                                    <div className={`h-20 p-3 ${theme === 'dark' ? 'bg-[#060606]' : 'bg-[#efefe9]'}`}>
                                                        <div className={`flex items-center justify-between rounded-lg border px-2.5 py-2 ${theme === 'dark' ? 'border-white/10 bg-white/[0.035] text-white' : 'border-black/10 bg-white/55 text-black'}`}><span className="text-[9px] font-semibold">NecrotixLab</span><span className="size-2 rounded-full" style={{ background: accent }} /></div>
                                                    </div>
                                                    <div className="flex items-center justify-between px-3.5 py-3"><span className="text-xs font-semibold capitalize text-white/75">{theme === 'dark' ? 'Night' : 'Day'}</span>{selected ? <Check className="size-4 text-white" /> : null}</div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
                                        <label className="text-xs text-white/45">Accent color
                                            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                                                <input type="color" value={accent} onChange={(event) => setTop('accentColor', event.target.value)} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                                                <input value={settings.accentColor} onChange={(event) => setTop('accentColor', event.target.value)} placeholder="#d1ff4d" className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/20" />
                                            </div>
                                        </label>
                                        <label className="flex min-h-[72px] items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 text-xs text-white/60">
                                            <input type="checkbox" checked={settings.allowDayMode} onChange={(event) => setTop('allowDayMode', event.target.checked)} className="size-4" />
                                            Allow visitor theme toggle
                                        </label>
                                    </div>
                                </Panel>
                            ) : null}

                            {active === 'contact' ? (
                                <div className="space-y-8">
                                    <Panel title="Public contact details" description="Shown across public contact surfaces where the corresponding value is enabled.">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="text-xs text-white/45">Public email<input type="email" value={settings.contactDetails.email} onChange={(event) => setContact('email', event.target.value)} className={input} /></label>
                                            <label className="text-xs text-white/45">Phone<input value={settings.contactDetails.phone} onChange={(event) => setContact('phone', event.target.value)} className={input} /></label>
                                            <label className="text-xs text-white/45">Location<input value={settings.contactDetails.location} onChange={(event) => setContact('location', event.target.value)} className={input} /></label>
                                            <label className="text-xs text-white/45">Website<input type="url" value={settings.contactDetails.website} onChange={(event) => setContact('website', event.target.value)} className={input} /></label>
                                        </div>
                                    </Panel>
                                    <Panel title="Contact form delivery" description="Private recipient for messages submitted through the public Contact form.">
                                        <label className="block text-xs text-white/45">Recipient email<input type="email" value={settings.contactDetails.formRecipientEmail} onChange={(event) => setContact('formRecipientEmail', event.target.value)} placeholder="inbox@example.com" className={input} /></label>
                                        <div className="mt-4 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] px-4 py-3 text-[10px] leading-5 text-emerald-100/50">Bot protection stays enabled with honeypot fields, same-origin validation, minimum completion time and rate limiting.</div>
                                    </Panel>
                                </div>
                            ) : null}

                            {active === 'social' ? (
                                <Panel title="Social profiles" description="Empty profiles stay hidden in public components that support them.">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="text-xs text-white/45">GitHub<input type="url" value={settings.socialLinks.github} onChange={(event) => setSocial('github', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45">Instagram<input type="url" value={settings.socialLinks.instagram} onChange={(event) => setSocial('instagram', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45">LinkedIn<input type="url" value={settings.socialLinks.linkedin} onChange={(event) => setSocial('linkedin', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45">X / Twitter<input type="url" value={settings.socialLinks.twitter} onChange={(event) => setSocial('twitter', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45">Discord<input type="url" value={settings.socialLinks.discord} onChange={(event) => setSocial('discord', event.target.value)} className={input} /></label>
                                        <label className="text-xs text-white/45">Spotify<input type="url" value={settings.socialLinks.spotify} onChange={(event) => setSocial('spotify', event.target.value)} className={input} /></label>
                                    </div>
                                </Panel>
                            ) : null}

                            {active === 'regional' ? (
                                <Panel title="Regional defaults" description="Locale influences formatting and the IANA timezone drives server-side/local-time displays.">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="text-xs text-white/45">Locale<input value={settings.locale} onChange={(event) => setTop('locale', event.target.value)} placeholder="en" className={input} /></label>
                                        <label className="text-xs text-white/45">Timezone<input value={settings.timezone} onChange={(event) => setTop('timezone', event.target.value)} placeholder="Europe/Sofia" className={input} /></label>
                                    </div>
                                </Panel>
                            ) : null}

                            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
                                <span className="text-[10px] text-white/30">Changes are previewed locally until saved.</span>
                                <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Save settings</button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="hidden xl:block xl:sticky xl:top-5 xl:self-start">
                    <PreviewFrame settings={settings} access={access} active={active} />
                </div>
            </div>

            <div className="xl:hidden">
                <PreviewFrame settings={settings} access={access} active={active} />
            </div>
        </div>
    );
}

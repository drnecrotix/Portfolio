import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { StatusToast } from '@/components/admin/StatusToast';
import { updateGeneralSettings } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [raw, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        searchParams,
    ]);
    const settings = normalizeGeneralSiteSettings(raw);

    return (
        <div className="mx-auto max-w-5xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Settings saved and public cache refreshed.' : undefined)} />
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">General Settings</p>
                <h2 className="mt-2 text-4xl font-semibold">Site identity & preferences</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/45">Central settings for identity, theme defaults, contact details and social profiles. Changes now invalidate the public layout cache immediately.</p>
            </div>

            <form action={updateGeneralSettings} className="space-y-8">
                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="text-sm text-white/60 md:col-span-2">Site name<input name="siteName" required defaultValue={settings.siteName} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Site description<textarea name="siteDescription" rows={3} defaultValue={settings.siteDescription} className={input} /></label>
                    <label className="text-sm text-white/60">Locale<input name="locale" defaultValue={settings.locale} className={input} /></label>
                    <label className="text-sm text-white/60">Timezone<input name="timezone" defaultValue={settings.timezone} className={input} /></label>
                    <label className="text-sm text-white/60">Default theme<select name="defaultTheme" defaultValue={settings.defaultTheme} className={input}><option value="dark">Night</option><option value="light">Day</option></select></label>
                    <label className="text-sm text-white/60">Accent color<input name="accentColor" placeholder="#7dd3fc" defaultValue={settings.accentColor} className={input} /></label>
                    <label className="flex items-center gap-3 text-sm text-white/60 md:col-span-2"><input type="checkbox" name="allowDayMode" defaultChecked={settings.allowDayMode} className="size-4" /> Allow Day mode toggle</label>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <div className="md:col-span-2"><h3 className="text-lg font-semibold">Contact details</h3><p className="mt-1 text-xs text-white/40">Single source of truth for public contact and identity components.</p></div>
                    <label className="text-sm text-white/60">Email<input type="email" name="email" defaultValue={settings.contactDetails.email} className={input} /></label>
                    <label className="text-sm text-white/60">Phone<input name="phone" defaultValue={settings.contactDetails.phone} className={input} /></label>
                    <label className="text-sm text-white/60">Location<input name="location" defaultValue={settings.contactDetails.location} className={input} /></label>
                    <label className="text-sm text-white/60">Website<input type="url" name="website" defaultValue={settings.contactDetails.website} className={input} /></label>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <div className="md:col-span-2"><h3 className="text-lg font-semibold">Social profiles</h3><p className="mt-1 text-xs text-white/40">Leave a profile empty to hide it where the public component supports it.</p></div>
                    <label className="text-sm text-white/60">GitHub<input type="url" name="github" defaultValue={settings.socialLinks.github} className={input} /></label>
                    <label className="text-sm text-white/60">Instagram<input type="url" name="instagram" defaultValue={settings.socialLinks.instagram} className={input} /></label>
                    <label className="text-sm text-white/60">LinkedIn<input type="url" name="linkedin" defaultValue={settings.socialLinks.linkedin} className={input} /></label>
                    <label className="text-sm text-white/60">X / Twitter<input type="url" name="twitter" defaultValue={settings.socialLinks.twitter} className={input} /></label>
                    <label className="text-sm text-white/60">Discord<input type="url" name="discord" defaultValue={settings.socialLinks.discord} className={input} /></label>
                    <label className="text-sm text-white/60">Spotify<input type="url" name="spotify" defaultValue={settings.socialLinks.spotify} className={input} /></label>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save settings</button>
            </form>
        </div>
    );
}

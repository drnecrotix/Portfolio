import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { updateHomepage } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

export default async function HomepageAdminPage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const content = normalizeHomepageContent(settings?.homepageContent);

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="mt-2 text-4xl font-semibold">Homepage</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/45">Edit hero content, profile details and the metadata used when the site is shared or crawled.</p>
                </div>
                <Link href="/" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Preview</Link>
            </div>

            <form action={updateHomepage} className="space-y-8">
                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <label className="text-sm text-white/60 md:col-span-2">Intro<textarea name="intro" defaultValue={content.intro} rows={3} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 1<input name="lineOne" defaultValue={content.lineOne} className={input} /></label>
                    <div />
                    <label className="text-sm text-white/60">Hero line 2 - before icon<input name="lineTwoPrefix" defaultValue={content.lineTwoPrefix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 2 - after icon<input name="lineTwoSuffix" defaultValue={content.lineTwoSuffix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 3 - before icon<input name="lineThreePrefix" defaultValue={content.lineThreePrefix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 3 - after icon<input name="lineThreeSuffix" defaultValue={content.lineThreeSuffix} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Collaboration text<textarea name="collaboration" defaultValue={content.collaboration} rows={3} className={input} /></label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <label className="text-sm text-white/60">Workspace/project URL<input name="workspaceUrl" defaultValue={content.workspaceUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Workspace tooltip<input name="workspaceTooltip" defaultValue={content.workspaceTooltip} className={input} /></label>
                    <label className="text-sm text-white/60">Assistant tooltip<input name="assistantTooltip" defaultValue={content.assistantTooltip} className={input} /></label>
                    <label className="text-sm text-white/60">Availability tab<input name="availabilityLabel" defaultValue={content.availabilityLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Profile card title<input name="profileTitle" defaultValue={content.profileTitle} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Profile card description<textarea name="profileDescription" defaultValue={content.profileDescription} rows={4} className={input} /></label>
                    <div className="md:col-span-2"><MediaPicker value={content.profileImage} inputName="profileImage" label="Profile card image" /></div>
                </section>

                <section className={section}>
                    <div className="mb-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Sharing & discovery</p>
                        <h3 className="mt-1 text-xl font-semibold">Social thumbnails & meta tags</h3>
                        <p className="mt-2 max-w-3xl text-xs leading-5 text-white/35">Default image is the fallback. Open Graph is used by Facebook, LinkedIn, Discord and many other preview clients. X/Twitter can use its own image.</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div><MediaPicker value={content.socialImage} inputName="socialImage" label="Default social thumbnail" initialKind="image" lockKind /></div>
                        <div><MediaPicker value={content.openGraphImage} inputName="openGraphImage" label="Open Graph thumbnail (optional override)" initialKind="image" lockKind /></div>
                        <div className="md:col-span-2"><MediaPicker value={content.twitterImage} inputName="twitterImage" label="X / Twitter thumbnail (optional override)" initialKind="image" lockKind /></div>
                        <label className="text-sm text-white/60 md:col-span-2">
                            Custom meta tags
                            <textarea name="customMetaTags" defaultValue={content.customMetaTags} rows={8} className={`${input} font-mono text-xs`} placeholder={'name:application-name=Necrotix Lab\nname:theme-color=#0a0a0f\nproperty:profile:username=drnecrotix'} />
                            <span className="mt-2 block text-[11px] leading-5 text-white/30">One tag per line: <code>name:key=value</code> or <code>property:key=value</code>. Only structured name/property + content values are rendered; raw HTML is not accepted.</span>
                        </label>
                    </div>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 font-semibold text-black">Save homepage</button>
            </form>
        </div>
    );
}

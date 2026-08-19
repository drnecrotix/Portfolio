import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { updateHomepage } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export default async function HomepageAdminPage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const content = normalizeHomepageContent(settings?.homepageContent);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="text-4xl font-semibold mt-2">Homepage</h2>
                    <p className="mt-3 text-sm text-white/45 max-w-2xl">Edit the content inside the preserved fullscreen hero. Layout, spacing, animations and responsive behavior stay protected.</p>
                </div>
                <Link href="/" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Preview</Link>
            </div>

            <form action={updateHomepage} className="space-y-8">
                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 grid md:grid-cols-2 gap-5">
                    <label className="md:col-span-2 text-sm text-white/60">Intro<textarea name="intro" defaultValue={content.intro} rows={3} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 1<input name="lineOne" defaultValue={content.lineOne} className={input} /></label>
                    <div />
                    <label className="text-sm text-white/60">Hero line 2 - before icon<input name="lineTwoPrefix" defaultValue={content.lineTwoPrefix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 2 - after icon<input name="lineTwoSuffix" defaultValue={content.lineTwoSuffix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 3 - before icon<input name="lineThreePrefix" defaultValue={content.lineThreePrefix} className={input} /></label>
                    <label className="text-sm text-white/60">Hero line 3 - after icon<input name="lineThreeSuffix" defaultValue={content.lineThreeSuffix} className={input} /></label>
                    <label className="md:col-span-2 text-sm text-white/60">Collaboration text<textarea name="collaboration" defaultValue={content.collaboration} rows={3} className={input} /></label>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 grid md:grid-cols-2 gap-5">
                    <label className="text-sm text-white/60">Location label<input name="locationLabel" defaultValue={content.locationLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Year label<input name="yearLabel" defaultValue={content.yearLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Resume button label<input name="resumeLabel" defaultValue={content.resumeLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Resume URL<input name="resumeHref" defaultValue={content.resumeHref} className={input} /></label>
                    <label className="text-sm text-white/60">Workspace/project URL<input name="workspaceUrl" defaultValue={content.workspaceUrl} className={input} /></label>
                    <label className="text-sm text-white/60">Workspace tooltip<input name="workspaceTooltip" defaultValue={content.workspaceTooltip} className={input} /></label>
                    <label className="text-sm text-white/60">Assistant tooltip<input name="assistantTooltip" defaultValue={content.assistantTooltip} className={input} /></label>
                    <label className="text-sm text-white/60">Availability tab<input name="availabilityLabel" defaultValue={content.availabilityLabel} className={input} /></label>
                    <label className="text-sm text-white/60">Profile card title<input name="profileTitle" defaultValue={content.profileTitle} className={input} /></label>
                    <label className="md:col-span-2 text-sm text-white/60">Profile card description<textarea name="profileDescription" defaultValue={content.profileDescription} rows={4} className={input} /></label>
                    <div className="md:col-span-2"><MediaPicker value={content.profileImage} inputName="profileImage" label="Profile card image" /></div>
                </section>

                <button className="rounded-xl bg-white text-black px-5 py-3 font-semibold">Save homepage</button>
            </form>
        </div>
    );
}

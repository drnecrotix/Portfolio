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
                    <p className="mt-3 max-w-2xl text-sm text-white/45">Edit the homepage hero, profile card, Blog and Projects sections. Sharing, metadata and crawler settings are managed from SEO.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/seo" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55 hover:text-white">SEO settings</Link>
                    <Link href="/" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white">Preview</Link>
                </div>
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

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Homepage Blog</p>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="showBlogPosts" defaultChecked={content.showBlogPosts} className="size-4" /> Show blog posts on homepage</label>
                    </div>
                    <label className="text-sm text-white/60">Section title<input name="homeBlogTitle" defaultValue={content.homeBlogTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Posts to show<input type="number" min={1} max={5} name="homeBlogPostLimit" defaultValue={content.homeBlogPostLimit} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Section subtitle<textarea name="homeBlogSubtitle" defaultValue={content.homeBlogSubtitle} rows={2} className={input} /></label>
                    <p className="text-xs leading-relaxed text-white/35 md:col-span-2">Shows up to 5 newest Journal posts on the homepage. The full publication archive remains available on the Blog page.</p>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Homepage Projects</p>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="showProjects" defaultChecked={content.showProjects} className="size-4" /> Show projects on homepage</label>
                    </div>
                    <label className="text-sm text-white/60">Section title<input name="homeProjectsTitle" defaultValue={content.homeProjectsTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Projects to show<input type="number" min={1} max={5} name="homeProjectLimit" defaultValue={content.homeProjectLimit} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Section subtitle<textarea name="homeProjectsSubtitle" defaultValue={content.homeProjectsSubtitle} rows={2} className={input} /></label>
                    <p className="text-xs leading-relaxed text-white/35 md:col-span-2">Shows up to 5 newest projects on the homepage. Desktop scrolling is gently assisted at the Journal / Projects boundary while mobile and touch scrolling remain native.</p>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 font-semibold text-black">Save homepage</button>
            </form>
        </div>
    );
}

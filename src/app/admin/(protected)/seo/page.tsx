import { prisma } from '@/lib/prisma';
import { normalizeSeoDefaults } from '@/lib/seo-settings';
import { updateSeoSettings } from './actions';
import { MediaPicker } from '@/components/admin/MediaPicker';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export default async function SeoAdminPage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const seo = normalizeSeoDefaults(settings?.seoDefaults);

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Global metadata</p>
                <h2 className="mt-2 text-4xl font-semibold">SEO</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/45">Control the site-wide metadata fallback. Project, Blog and Page SEO fields can still override these defaults on their own routes.</p>
            </div>

            <form action={updateSeoSettings} className="space-y-8">
                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="text-sm text-white/60 md:col-span-2">Default title<input name="titleDefault" defaultValue={seo.titleDefault} className={input} /></label>
                    <label className="text-sm text-white/60">Title template<input name="titleTemplate" defaultValue={seo.titleTemplate} className={input} /></label>
                    <label className="text-sm text-white/60">Locale<input name="locale" defaultValue={seo.locale} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Description<textarea name="description" rows={3} defaultValue={seo.description} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Keywords - comma separated<input name="keywords" defaultValue={seo.keywords.join(', ')} className={input} /></label>
                    <label className="text-sm text-white/60">Author name<input name="authorName" defaultValue={seo.authorName} className={input} /></label>
                    <label className="text-sm text-white/60">Creator name<input name="creatorName" defaultValue={seo.creatorName} className={input} /></label>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="text-sm text-white/60">Open Graph title<input name="ogTitle" defaultValue={seo.ogTitle} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Open Graph description<textarea name="ogDescription" rows={3} defaultValue={seo.ogDescription} className={input} /></label>
                    <div className="md:col-span-2"><MediaPicker inputName="ogImage" value={seo.ogImage} label="Open Graph image" /></div>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="text-sm text-white/60">Twitter/X title<input name="twitterTitle" defaultValue={seo.twitterTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Twitter/X creator<input name="twitterCreator" placeholder="@username" defaultValue={seo.twitterCreator} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Twitter/X description<textarea name="twitterDescription" rows={3} defaultValue={seo.twitterDescription} className={input} /></label>
                    <div className="md:col-span-2"><MediaPicker inputName="twitterImage" value={seo.twitterImage} label="Twitter/X image" /></div>
                </section>

                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="indexSite" defaultChecked={seo.indexSite} /> Allow search engine indexing</label>
                    <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="followLinks" defaultChecked={seo.followLinks} /> Allow crawlers to follow links</label>
                    <label className="text-sm text-white/60 md:col-span-2">Google site verification token<input name="googleVerification" defaultValue={seo.googleVerification} className={input} /></label>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save SEO settings</button>
            </form>
        </div>
    );
}

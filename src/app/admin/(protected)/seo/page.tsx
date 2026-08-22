import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeSeoDefaults } from '@/lib/seo-settings';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { updateSeoSettings } from './actions';
import { MediaPicker } from '@/components/admin/MediaPicker';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

export default async function SeoAdminPage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const seo = normalizeSeoDefaults(settings?.seoDefaults);
    const homepage = normalizeHomepageContent(settings?.homepageContent);

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Search & sharing</p>
                    <h2 className="mt-2 text-4xl font-semibold">SEO</h2>
                    <p className="mt-3 max-w-3xl text-sm text-white/45">Central control for metadata, social previews, crawler rules, sitemap and RSS. Blog, Project and Page SEO fields can override these defaults on their own routes.</p>
                </div>
                <div className="flex gap-2 text-xs">
                    <Link href="/sitemap.xml" target="_blank" className="rounded-lg border border-white/10 px-3 py-2 text-white/55 hover:text-white">View sitemap</Link>
                    <Link href="/rss.xml" target="_blank" className="rounded-lg border border-white/10 px-3 py-2 text-white/55 hover:text-white">View RSS</Link>
                </div>
            </div>

            <form action={updateSeoSettings} className="space-y-8">
                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Search metadata</p>
                        <h3 className="mt-1 text-xl font-semibold">Titles, descriptions & identity</h3>
                    </div>
                    <label className="text-sm text-white/60 md:col-span-2">Default title<input name="titleDefault" defaultValue={seo.titleDefault} className={input} /></label>
                    <label className="text-sm text-white/60">Title template<input name="titleTemplate" defaultValue={seo.titleTemplate} className={input} /></label>
                    <label className="text-sm text-white/60">Locale<input name="locale" defaultValue={seo.locale} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Description<textarea name="description" rows={3} defaultValue={seo.description} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Keywords - comma separated<input name="keywords" defaultValue={seo.keywords.join(', ')} className={input} /></label>
                    <label className="text-sm text-white/60">Author name<input name="authorName" defaultValue={seo.authorName} className={input} /></label>
                    <label className="text-sm text-white/60">Creator name<input name="creatorName" defaultValue={seo.creatorName} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Google site verification token<input name="googleVerification" defaultValue={seo.googleVerification} className={input} /></label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Social previews</p>
                        <h3 className="mt-1 text-xl font-semibold">Default thumbnail & Open Graph</h3>
                        <p className="mt-2 text-xs leading-5 text-white/35">Blog posts and projects use their own main image first. If none exists, they fall back to the default social thumbnail below.</p>
                    </div>
                    <div className="md:col-span-2"><MediaPicker inputName="socialImage" value={homepage.socialImage} label="Default social thumbnail" initialKind="image" lockKind /></div>
                    <label className="text-sm text-white/60">Open Graph title<input name="ogTitle" defaultValue={seo.ogTitle} className={input} /></label>
                    <div />
                    <label className="text-sm text-white/60 md:col-span-2">Open Graph description<textarea name="ogDescription" rows={3} defaultValue={seo.ogDescription} className={input} /></label>
                    <div><MediaPicker inputName="ogImage" value={seo.ogImage} label="Global Open Graph image" initialKind="image" lockKind /></div>
                    <div><MediaPicker inputName="homepageOpenGraphImage" value={homepage.openGraphImage} label="Homepage Open Graph override" initialKind="image" lockKind /></div>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">X / Twitter</p>
                        <h3 className="mt-1 text-xl font-semibold">Twitter Card metadata</h3>
                    </div>
                    <label className="text-sm text-white/60">Twitter/X title<input name="twitterTitle" defaultValue={seo.twitterTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Twitter/X creator<input name="twitterCreator" placeholder="@username" defaultValue={seo.twitterCreator} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Twitter/X description<textarea name="twitterDescription" rows={3} defaultValue={seo.twitterDescription} className={input} /></label>
                    <div><MediaPicker inputName="twitterImage" value={seo.twitterImage} label="Global Twitter/X image" initialKind="image" lockKind /></div>
                    <div><MediaPicker inputName="homepageTwitterImage" value={homepage.twitterImage} label="Homepage Twitter/X override" initialKind="image" lockKind /></div>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Crawlers</p>
                        <h3 className="mt-1 text-xl font-semibold">Indexing & custom meta tags</h3>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="indexSite" defaultChecked={seo.indexSite} /> Allow search engine indexing</label>
                    <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="followLinks" defaultChecked={seo.followLinks} /> Allow crawlers to follow links</label>
                    <label className="text-sm text-white/60 md:col-span-2">
                        Custom meta tags
                        <textarea name="customMetaTags" defaultValue={homepage.customMetaTags} rows={8} className={`${input} font-mono text-xs`} placeholder={'name:application-name=Necrotix Lab\nname:theme-color=#0a0a0f\nproperty:profile:username=drnecrotix'} />
                        <span className="mt-2 block text-[11px] leading-5 text-white/30">One tag per line: <code>name:key=value</code> or <code>property:key=value</code>.</span>
                    </label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Discovery endpoints</p>
                        <h3 className="mt-1 text-xl font-semibold">Sitemap & RSS</h3>
                        <p className="mt-2 text-xs leading-5 text-white/35">Automatic mode reads current published content directly from the CMS whenever the endpoint is requested.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="sitemapEnabled" defaultChecked={seo.sitemapEnabled} /> Enable sitemap.xml</label>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/55"><input type="checkbox" name="sitemapAutoUpdate" defaultChecked={seo.sitemapAutoUpdate} /> Automatically include published Blog and Projects</label>
                        <p className="mt-3 text-xs text-white/30">Endpoint: /sitemap.xml</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="rssEnabled" defaultChecked={seo.rssEnabled} /> Enable RSS feed</label>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/55"><input type="checkbox" name="rssAutoUpdate" defaultChecked={seo.rssAutoUpdate} /> Automatically include latest published content</label>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/55"><input type="checkbox" name="rssIncludeProjects" defaultChecked={seo.rssIncludeProjects} /> Include projects in RSS</label>
                        <p className="mt-3 text-xs text-white/30">Endpoint: /rss.xml</p>
                    </div>
                    <label className="text-sm text-white/60">RSS title<input name="rssTitle" defaultValue={seo.rssTitle} className={input} /></label>
                    <label className="text-sm text-white/60">RSS item limit<input type="number" min={1} max={100} name="rssItemLimit" defaultValue={seo.rssItemLimit} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">RSS description<textarea name="rssDescription" rows={3} defaultValue={seo.rssDescription} className={input} /></label>
                </section>

                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save SEO settings</button>
            </form>
        </div>
    );
}

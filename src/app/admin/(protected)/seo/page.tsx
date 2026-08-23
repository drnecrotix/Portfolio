import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeSeoDefaults } from '@/lib/seo-settings';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { updateSeoSettings } from './actions';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { StatusToast } from '@/components/admin/StatusToast';
import { SeoSaveButton } from '@/components/admin/SeoSaveButton';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const section = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function SeoAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [settings, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        searchParams,
    ]);
    const seo = normalizeSeoDefaults(settings?.seoDefaults);
    const homepage = normalizeHomepageContent(settings?.homepageContent);

    return (
        <div className="mx-auto max-w-5xl">
            <StatusToast
                type={params.error ? 'error' : params.saved ? 'success' : undefined}
                message={params.error || (params.saved ? 'SEO settings saved successfully and public metadata cache refreshed.' : undefined)}
            />

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
                    <label className="text-sm text-white/60">Publisher name<input name="publisherName" defaultValue={seo.publisherName} className={input} /></label>
                    <label className="text-sm text-white/60">Application name<input name="applicationName" defaultValue={seo.applicationName} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Google site verification token<input name="googleVerification" defaultValue={seo.googleVerification} className={input} /></label>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Social previews</p>
                        <h3 className="mt-1 text-xl font-semibold">Images used when pages are shared</h3>
                        <p className="mt-2 text-xs leading-5 text-white/35">Priority is simple: a Blog/Project featured image wins first, then the optional site-wide Open Graph or Twitter override, then the Default social image. Homepage uses the same site-wide rules.</p>
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/10 p-4">
                        <MediaPicker inputName="socialImage" value={homepage.socialImage} label="Default social image" initialKind="image" lockKind />
                        <p className="mt-2 text-[11px] leading-5 text-white/30">Fallback image used when a more specific Open Graph, Twitter/X, Blog or Project image is not available.</p>
                    </div>

                    <label className="text-sm text-white/60">Open Graph title<input name="ogTitle" defaultValue={seo.ogTitle} className={input} /></label>
                    <div />
                    <label className="text-sm text-white/60 md:col-span-2">Open Graph description<textarea name="ogDescription" rows={3} defaultValue={seo.ogDescription} className={input} /></label>
                    <div className="md:col-span-2">
                        <MediaPicker inputName="ogImage" value={seo.ogImage} label="Open Graph image override - optional" initialKind="image" lockKind />
                        <p className="mt-2 text-[11px] leading-5 text-white/30">Leave empty to use Default social image. This applies site-wide unless the individual Blog post or Project has its own image.</p>
                    </div>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">X / Twitter</p>
                        <h3 className="mt-1 text-xl font-semibold">Twitter Card metadata</h3>
                    </div>
                    <label className="text-sm text-white/60">Twitter/X title<input name="twitterTitle" defaultValue={seo.twitterTitle} className={input} /></label>
                    <label className="text-sm text-white/60">Twitter/X creator<input name="twitterCreator" placeholder="@username" defaultValue={seo.twitterCreator} className={input} /></label>
                    <label className="text-sm text-white/60 md:col-span-2">Twitter/X description<textarea name="twitterDescription" rows={3} defaultValue={seo.twitterDescription} className={input} /></label>
                    <div className="md:col-span-2">
                        <MediaPicker inputName="twitterImage" value={seo.twitterImage} label="Twitter/X image override - optional" initialKind="image" lockKind />
                        <p className="mt-2 text-[11px] leading-5 text-white/30">Leave empty to use Default social image. Homepage follows this same setting automatically.</p>
                    </div>
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Crawlers</p>
                        <h3 className="mt-1 text-xl font-semibold">Indexing & custom meta tags</h3>
                        <p className="mt-2 text-xs leading-5 text-white/35">Global defaults for search crawlers. Individual routes can still override metadata when their own SEO settings are available.</p>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/10 p-4 md:col-span-2 sm:grid-cols-2">
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="indexSite" defaultChecked={seo.indexSite} /> Index site</label>
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="followLinks" defaultChecked={seo.followLinks} /> Follow links</label>
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="noArchive" defaultChecked={seo.noArchive} /> No archive</label>
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="noSnippet" defaultChecked={seo.noSnippet} /> No snippet</label>
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="noImageIndex" defaultChecked={seo.noImageIndex} /> No image indexing</label>
                        <label className="flex items-center gap-3 text-sm text-white/65"><input type="checkbox" name="noTranslate" defaultChecked={seo.noTranslate} /> No translation offer</label>
                    </div>

                    <label className="text-sm text-white/60 md:col-span-2">Canonical URL - optional<input name="canonicalUrl" type="url" placeholder="https://necrotixlab.com/" defaultValue={seo.canonicalUrl} className={input} /><span className="mt-2 block text-[11px] text-white/30">Leave empty to let individual routes use their own URL.</span></label>
                    <label className="text-sm text-white/60">Referrer policy<select name="referrerPolicy" defaultValue={seo.referrerPolicy} className={input}><option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</option><option value="no-referrer">no-referrer</option><option value="origin">origin</option><option value="no-referrer-when-downgrade">no-referrer-when-downgrade</option><option value="origin-when-cross-origin">origin-when-cross-origin</option><option value="same-origin">same-origin</option><option value="strict-origin">strict-origin</option><option value="unsafe-url">unsafe-url</option></select></label>
                    <label className="text-sm text-white/60">Max image preview<select name="maxImagePreview" defaultValue={seo.maxImagePreview} className={input}><option value="large">Large</option><option value="standard">Standard</option><option value="none">None</option></select></label>
                    <label className="text-sm text-white/60">Max snippet characters<input type="number" min={-1} max={10000} name="maxSnippet" defaultValue={seo.maxSnippet} className={input} /><span className="mt-2 block text-[11px] text-white/30">-1 means no limit.</span></label>
                    <label className="text-sm text-white/60">Max video preview seconds<input type="number" min={-1} max={10000} name="maxVideoPreview" defaultValue={seo.maxVideoPreview} className={input} /><span className="mt-2 block text-[11px] text-white/30">-1 means no limit.</span></label>

                    <label className="text-sm text-white/60 md:col-span-2">
                        Custom meta tags
                        <textarea name="customMetaTags" defaultValue={homepage.customMetaTags} rows={9} className={`${input} font-mono text-xs`} placeholder={'name:theme-color=#0a0a0f\nproperty:profile:username=drnecrotix\nhttp-equiv:content-language=en'} />
                        <span className="mt-2 block text-[11px] leading-5 text-white/30">One tag per line: <code>name:key=value</code>, <code>property:key=value</code> or <code>http-equiv:key=value</code>. Invalid lines are ignored.</span>
                    </label>

                    {!seo.indexSite && seo.sitemapEnabled && <div className="md:col-span-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100/80">Indexing is disabled while sitemap.xml is enabled. This is allowed, but usually you should disable the sitemap too if the whole public site should stay out of search.</div>}
                </section>

                <section className={`${section} grid gap-5 md:grid-cols-2`}>
                    <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Discovery endpoints</p>
                        <h3 className="mt-1 text-xl font-semibold">Sitemap & RSS</h3>
                        <p className="mt-2 text-xs leading-5 text-white/35">Automatic mode reads current published content directly from the CMS whenever the endpoint is requested.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="sitemapEnabled" defaultChecked={seo.sitemapEnabled} /> Enable sitemap.xml</label>
                        <label className="mt-4 flex items-center gap-3 text-sm text-white/55"><input type="checkbox" name="sitemapAutoUpdate" defaultChecked={seo.sitemapAutoUpdate} /> Automatically include published content</label>
                        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                            <label className="flex items-center gap-3 text-xs text-white/50"><input type="checkbox" name="sitemapIncludeBlog" defaultChecked={seo.sitemapIncludeBlog} /> Include Blog</label>
                            <label className="flex items-center gap-3 text-xs text-white/50"><input type="checkbox" name="sitemapIncludeProjects" defaultChecked={seo.sitemapIncludeProjects} /> Include Projects</label>
                            <label className="flex items-center gap-3 text-xs text-white/50"><input type="checkbox" name="sitemapIncludePages" defaultChecked={seo.sitemapIncludePages} /> Include CMS Pages</label>
                        </div>
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

                <SeoSaveButton />
            </form>
        </div>
    );
}

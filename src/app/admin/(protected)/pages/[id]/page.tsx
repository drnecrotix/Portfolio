import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { pageContentToHtml, pageFeaturedImage } from '@/lib/cms-pages';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { deletePage, updatePage } from '../actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const page = await prisma.page.findUnique({ where: { id }, include: { revisions: { orderBy: { createdAt: 'desc' }, take: 8 } } });
    if (!page) notFound();

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Pages CMS</p>
                    <h2 className="text-4xl font-semibold mt-2">{page.title}</h2>
                </div>
                <Link href={`/pages/${page.slug}`} target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70">Preview public URL</Link>
            </div>

            <form action={updatePage.bind(null, page.id)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                    <label className="text-sm text-white/60">Title<input name="title" defaultValue={page.title} required className={input} /></label>
                    <label className="text-sm text-white/60">Slug<input name="slug" defaultValue={page.slug} required pattern="[a-z0-9-]+" className={input} /></label>
                    <label className="text-sm text-white/60">Status<select name="status" defaultValue={page.status} className={input}><option value="DRAFT">Draft</option><option value="REVIEW">Review</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                    <div />
                    <label className="text-sm text-white/60">SEO title<input name="seoTitle" defaultValue={page.seoTitle ?? ''} className={input} /></label>
                    <label className="text-sm text-white/60">SEO description<input name="seoDescription" defaultValue={page.seoDescription ?? ''} className={input} /></label>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><MediaPicker value={pageFeaturedImage(page.content)} inputName="featuredImage" label="Featured image (optional)" /></div>
                <label className="block text-sm text-white/60">Page content (HTML)<textarea name="content" rows={20} defaultValue={pageContentToHtml(page.content)} className={`${input} font-mono`} /></label>
                <button className="rounded-xl bg-white text-black px-5 py-3 font-semibold">Save page</button>
            </form>

            <section className="mt-12 border-t border-white/10 pt-8">
                <h3 className="text-lg font-semibold">Recent revisions</h3>
                <div className="mt-4 space-y-2 text-sm text-white/45">
                    {page.revisions.map((revision) => <div key={revision.id}>{revision.createdAt.toLocaleString()}</div>)}
                    {page.revisions.length === 0 && <p>No revisions yet.</p>}
                </div>
            </section>

            <form action={deletePage.bind(null, page.id)} className="mt-10 border-t border-red-500/20 pt-8">
                <button className="text-sm text-red-400 hover:text-red-300">Delete page</button>
            </form>
        </div>
    );
}

import { MediaPicker } from '@/components/admin/MediaPicker';
import { createPage } from '../actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export default function NewPagePage() {
    return (
        <div className="max-w-4xl mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-white/35">Pages CMS</p>
            <h2 className="text-4xl font-semibold mt-2 mb-8">New page</h2>
            <form action={createPage} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                    <label className="text-sm text-white/60">Title<input name="title" required className={input} /></label>
                    <label className="text-sm text-white/60">Slug<input name="slug" required pattern="[a-z0-9-]+" className={input} /></label>
                    <label className="text-sm text-white/60">Status<select name="status" defaultValue="DRAFT" className={input}><option value="DRAFT">Draft</option><option value="REVIEW">Review</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                    <div />
                    <label className="text-sm text-white/60">SEO title<input name="seoTitle" className={input} /></label>
                    <label className="text-sm text-white/60">SEO description<input name="seoDescription" className={input} /></label>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><MediaPicker inputName="featuredImage" label="Featured image (optional)" /></div>
                <label className="block text-sm text-white/60">Page content (HTML)<textarea name="content" rows={18} className={`${input} font-mono`} placeholder="<p>Your content...</p>" /></label>
                <button className="rounded-xl bg-white text-black px-5 py-3 font-semibold">Create page</button>
            </form>
        </div>
    );
}

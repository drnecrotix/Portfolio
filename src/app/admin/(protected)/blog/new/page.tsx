import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { createPost } from '../actions';

export default function NewBlogPostPage() {
    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Blog</p>
                <h2 className="mt-2 text-4xl font-semibold">New publication</h2>
            </div>
            <form action={createPost} className="space-y-8">
                <BlogPostForm />
                <div className="flex justify-end">
                    <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Create publication</button>
                </div>
            </form>
        </div>
    );
}

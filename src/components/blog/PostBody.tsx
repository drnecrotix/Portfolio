import type { CmsPostContent } from '@/lib/cms-posts';
import { sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

export function PostBody({ type, content }: { type: string; content: CmsPostContent }) {
    if (type === 'POETRY') {
        return (
            <div className="mx-auto max-w-2xl whitespace-pre-wrap font-serif text-lg leading-9 text-foreground md:text-xl md:leading-10">
                {content.text ?? ''}
            </div>
        );
    }

    return (
        <div
            className="prose prose-lg max-w-none prose-headings:scroll-mt-32 prose-headings:font-black prose-headings:tracking-tight prose-h2:mb-5 prose-h2:mt-14 prose-h2:text-3xl prose-h3:mt-10 prose-p:my-6 prose-p:leading-8 prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-fuchsia-600 prose-a:decoration-fuchsia-500/30 prose-a:underline-offset-4 prose-hr:my-14 prose-hr:border-foreground/10 prose-blockquote:my-12 prose-blockquote:rounded-r-2xl prose-blockquote:border-l-4 prose-blockquote:border-fuchsia-500/70 prose-blockquote:bg-foreground/[0.025] prose-blockquote:px-7 prose-blockquote:py-5 prose-blockquote:text-xl prose-blockquote:font-medium prose-blockquote:italic prose-blockquote:leading-9 prose-blockquote:text-foreground prose-blockquote:[quotes:none] prose-blockquote:before:content-none prose-blockquote:after:content-none prose-img:my-12 prose-img:rounded-2xl prose-img:border prose-img:border-foreground/10 prose-li:text-muted-foreground dark:prose-invert dark:prose-a:text-fuchsia-300 [&>p:first-of-type]:text-[1.08rem] [&>p:first-of-type]:leading-8 [&>p:first-of-type]:text-foreground/85"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.html ?? '') }}
        />
    );
}

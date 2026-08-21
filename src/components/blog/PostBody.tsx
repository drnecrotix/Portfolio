import type { CmsPostContent } from '@/lib/cms-posts';
import { sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

export function PostBody({ type, content }: { type: string; content: CmsPostContent }) {
    if (type === 'POETRY') {
        return (
            <div className="mx-auto max-w-3xl whitespace-pre-wrap font-serif text-lg leading-9 text-foreground md:text-xl md:leading-10">
                {content.text ?? ''}
            </div>
        );
    }

    return (
        <div
            className="prose prose-lg max-w-none prose-headings:scroll-mt-32 prose-headings:font-black prose-headings:tracking-tight prose-h2:mb-6 prose-h2:mt-12 prose-h2:text-3xl prose-p:mb-8 prose-p:leading-loose prose-p:text-muted-foreground prose-strong:text-foreground prose-blockquote:my-12 prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:text-xl prose-blockquote:font-medium prose-blockquote:text-foreground prose-img:my-12 prose-img:rounded-2xl prose-img:border prose-img:border-foreground/10 prose-li:text-muted-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.html ?? '') }}
        />
    );
}

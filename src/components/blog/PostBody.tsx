import type { CmsPostContent } from '@/lib/cms-posts';

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
            className="prose prose-lg max-w-none prose-headings:tracking-tight dark:prose-invert prose-p:leading-8 prose-blockquote:border-primary"
            dangerouslySetInnerHTML={{ __html: content.html ?? '' }}
        />
    );
}

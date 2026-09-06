'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type HeadingItem = {
    id: string;
    text: string;
    level: 2 | 3;
};

type PreviewImage = {
    src: string;
    alt: string;
} | null;

function headingSlug(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('en')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'section';
}

function TocList({ headings, onNavigate }: { headings: HeadingItem[]; onNavigate?: () => void }) {
    return (
        <ol className="space-y-1.5">
            {headings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? 'pl-3' : ''}>
                    <a href={`#${heading.id}`} onClick={onNavigate} className="block border-l border-foreground/10 py-1 pl-3 text-xs leading-5 text-muted-foreground transition hover:border-fuchsia-500/60 hover:text-foreground">
                        {heading.text}
                    </a>
                </li>
            ))}
        </ol>
    );
}

export function EditorialArticleContent({ html, postType }: { html: string; postType: string }) {
    const articleRef = useRef<HTMLDivElement>(null);
    const [headings, setHeadings] = useState<HeadingItem[]>([]);
    const [progress, setProgress] = useState(0);
    const [previewImage, setPreviewImage] = useState<PreviewImage>(null);
    const [mobileTocOpen, setMobileTocOpen] = useState(false);

    useEffect(() => {
        const root = articleRef.current;
        if (!root) return;

        const usedIds = new Set<string>();
        const nextHeadings: HeadingItem[] = [];
        const cleanups: Array<() => void> = [];

        for (const element of Array.from(root.querySelectorAll<HTMLHeadingElement>('h2, h3'))) {
            const text = element.textContent?.replace(/#\s*$/, '').trim() || 'Section';
            const base = headingSlug(text);
            let id = element.id || base;
            let suffix = 2;
            while (usedIds.has(id)) id = `${base}-${suffix++}`;
            usedIds.add(id);
            element.id = id;

            if (!element.querySelector('[data-heading-anchor]')) {
                const anchor = document.createElement('a');
                anchor.dataset.headingAnchor = 'true';
                anchor.href = `#${id}`;
                anchor.setAttribute('aria-label', `Link to ${text}`);
                anchor.textContent = '#';
                anchor.className = 'ml-2 no-underline text-fuchsia-500/45 opacity-60 transition hover:text-fuchsia-500 md:opacity-0 md:group-hover:opacity-100';
                element.classList.add('group');
                element.append(anchor);
            }

            nextHeadings.push({ id, text, level: element.tagName === 'H3' ? 3 : 2 });
        }

        for (const pre of Array.from(root.querySelectorAll<HTMLPreElement>('pre'))) {
            pre.classList.add('relative');
            if (pre.querySelector('[data-copy-code]')) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.copyCode = 'true';
            button.className = 'absolute right-3 top-3 inline-flex items-center rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/65 backdrop-blur transition hover:text-white';
            button.textContent = 'Copy';
            const copy = async () => {
                const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
                try {
                    await navigator.clipboard.writeText(code.replace(/Copy$/, '').trim());
                    button.textContent = 'Copied';
                    window.setTimeout(() => { button.textContent = 'Copy'; }, 1200);
                } catch {
                    button.textContent = 'Unable to copy';
                    window.setTimeout(() => { button.textContent = 'Copy'; }, 1200);
                }
            };
            button.addEventListener('click', copy);
            pre.append(button);
            cleanups.push(() => button.removeEventListener('click', copy));
        }

        for (const image of Array.from(root.querySelectorAll<HTMLImageElement>('img'))) {
            image.classList.add('cursor-zoom-in');
            image.tabIndex = 0;
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label', image.alt ? `Open image: ${image.alt}` : 'Open image');
            const open = () => setPreviewImage({ src: image.currentSrc || image.src, alt: image.alt || '' });
            const onKey = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            };
            image.addEventListener('click', open);
            image.addEventListener('keydown', onKey);
            cleanups.push(() => {
                image.removeEventListener('click', open);
                image.removeEventListener('keydown', onKey);
            });
        }

        setHeadings(nextHeadings);
        return () => cleanups.forEach((cleanup) => cleanup());
    }, [html]);

    useEffect(() => {
        const updateProgress = () => {
            const root = articleRef.current;
            if (!root) return;
            const rect = root.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top;
            const start = absoluteTop - window.innerHeight * 0.18;
            const end = absoluteTop + root.offsetHeight - window.innerHeight * 0.72;
            const ratio = end <= start ? 1 : (window.scrollY - start) / (end - start);
            setProgress(Math.max(0, Math.min(100, ratio * 100)));
        };
        updateProgress();
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress);
        return () => {
            window.removeEventListener('scroll', updateProgress);
            window.removeEventListener('resize', updateProgress);
        };
    }, [html]);

    useEffect(() => {
        if (!previewImage) return;
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPreviewImage(null);
        };
        document.addEventListener('keydown', close);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', close);
            document.body.style.overflow = previousOverflow;
        };
    }, [previewImage]);

    const showToc = headings.length >= 3 && postType !== 'NOTE' && postType !== 'THOUGHT';
    const compactText = postType === 'NOTE' || postType === 'THOUGHT';

    return (
        <>
            <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[2px] bg-transparent" aria-hidden="true">
                <div className="h-full bg-fuchsia-500 transition-[width] duration-75" style={{ width: `${progress}%` }} />
            </div>

            {showToc && (
                <details open={mobileTocOpen} onToggle={(event) => setMobileTocOpen(event.currentTarget.open)} className="mb-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 xl:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                        On this page <ChevronDown className={cn('size-4 text-muted-foreground transition', mobileTocOpen && 'rotate-180')} />
                    </summary>
                    <div className="mt-4 border-t border-foreground/10 pt-4"><TocList headings={headings} onNavigate={() => setMobileTocOpen(false)} /></div>
                </details>
            )}

            <div className={cn(showToc && 'xl:grid xl:grid-cols-[190px_minmax(0,1fr)] xl:items-start xl:gap-14')}>
                {showToc && (
                    <aside className="sticky top-28 hidden max-h-[calc(100vh-9rem)] overflow-y-auto pr-2 xl:block">
                        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">On this page</p>
                        <TocList headings={headings} />
                    </aside>
                )}

                <div
                    ref={articleRef}
                    className={cn(
                        'prose prose-lg min-w-0 max-w-none dark:prose-invert',
                        'prose-headings:scroll-mt-32 prose-headings:font-black prose-headings:tracking-tight',
                        'prose-h2:mb-5 prose-h2:mt-14 prose-h2:text-3xl prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-2xl',
                        'prose-p:my-6 prose-p:leading-8 prose-p:text-muted-foreground prose-strong:text-foreground',
                        'prose-a:text-fuchsia-600 prose-a:decoration-fuchsia-500/30 prose-a:underline-offset-4 dark:prose-a:text-fuchsia-300',
                        'prose-hr:my-14 prose-hr:border-foreground/10',
                        'prose-blockquote:my-12 prose-blockquote:rounded-r-2xl prose-blockquote:border-l-4 prose-blockquote:border-fuchsia-500/70 prose-blockquote:bg-foreground/[0.025] prose-blockquote:px-7 prose-blockquote:py-5 prose-blockquote:text-xl prose-blockquote:font-medium prose-blockquote:italic prose-blockquote:leading-9 prose-blockquote:text-foreground prose-blockquote:[quotes:none] prose-blockquote:before:content-none prose-blockquote:after:content-none',
                        'prose-code:rounded prose-code:bg-foreground/[0.055] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-fuchsia-600 prose-code:before:content-none prose-code:after:content-none dark:prose-code:text-fuchsia-200',
                        'prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-foreground/10 prose-pre:bg-[#090909] prose-pre:pt-12',
                        'prose-img:my-12 prose-img:rounded-2xl prose-img:border prose-img:border-foreground/10 prose-li:text-muted-foreground',
                        '[&>p:first-of-type]:text-[1.08rem] [&>p:first-of-type]:leading-8 [&>p:first-of-type]:text-foreground/85',
                        compactText && 'mx-auto max-w-2xl prose-p:text-[1.08rem] prose-p:leading-9',
                    )}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>

            {previewImage && (
                <div role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreviewImage(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm">
                    <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-white/15 bg-black/50 text-white" aria-label="Close image preview"><X className="size-5" /></button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewImage.src} alt={previewImage.alt} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain" />
                </div>
            )}
        </>
    );
}

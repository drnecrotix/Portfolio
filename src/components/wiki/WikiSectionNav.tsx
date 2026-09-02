import Link from 'next/link';
import { BookOpen, CircleHelp, LibraryBig } from 'lucide-react';

export type WikiNavSection = 'main' | 'articles' | 'faq';

const items = [
    { key: 'main' as const, href: '/wiki', label: 'Main article', shortLabel: 'Main', icon: BookOpen },
    { key: 'articles' as const, href: '/wiki/articles', label: 'All articles', shortLabel: 'Articles', icon: LibraryBig },
    { key: 'faq' as const, href: '/wiki/faq', label: 'FAQ', shortLabel: 'FAQ', icon: CircleHelp },
];

export function WikiSectionNav({ active, compact = false }: { active: WikiNavSection; compact?: boolean }) {
    return (
        <div className={compact ? 'grid grid-cols-3 gap-2' : 'flex flex-wrap items-center gap-2'}>
            {items.map((item) => {
                const Icon = item.icon;
                const selected = item.key === active;
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={selected ? 'page' : undefined}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${selected ? 'border-sky-400/35 bg-sky-500/[0.1] text-sky-600 dark:text-sky-300' : 'border-foreground/15 bg-foreground/[0.035] text-foreground/75 hover:border-sky-400/25 hover:bg-sky-500/[0.06] hover:text-foreground'}`}
                    >
                        <Icon className="size-3.5 shrink-0" />
                        <span className={compact ? 'hidden min-[390px]:inline' : ''}>{compact ? item.shortLabel : item.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

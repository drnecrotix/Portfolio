'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackToLabLink({ href, label }: { href?: string; label?: string }) {
    const pathname = usePathname();
    const onServicesLanding = pathname === '/services';
    const targetHref = href ?? (onServicesLanding ? '/lab' : '/services');
    const targetLabel = label ?? (onServicesLanding ? 'Back to Lab' : 'Services');

    return (
        <Link href={targetHref} className="mb-8 inline-flex items-center gap-2 border border-border/80 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition hover:border-foreground hover:bg-foreground hover:text-background">
            <ArrowLeft className="size-3.5" />
            {targetLabel}
        </Link>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { PdfViewer } from '@/components/ui/pdf-viewer';

export const metadata: Metadata = {
    title: 'CV Web View | Career Dossier',
    description: 'Browser view of the current CV document attached to the Career Dossier.',
    alternates: { canonical: '/resume' },
    robots: { index: false, follow: true },
};

export default function ResumeWebViewPage() {
    return (
        <main className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-background pt-20 text-foreground sm:pt-24">
            <div className="mx-auto flex w-full max-w-[1500px] flex-none flex-wrap items-center justify-between gap-3 px-4 pb-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href="/resume" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.025] text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Back to Career Dossier">
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground"><FileText className="size-3.5" /> Career Dossier</div>
                        <h1 className="truncate text-sm font-black tracking-tight sm:text-base">CV Web View</h1>
                    </div>
                </div>
                <a href="/api/resume/download" className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-500/45 hover:bg-sky-500/15 dark:text-sky-300">
                    <Download className="size-3.5" /> Download CV
                </a>
            </div>

            <div className="mx-auto min-h-0 w-full max-w-[1500px] flex-1 px-2 pb-2 sm:px-4 sm:pb-4">
                <PdfViewer url="/api/resume/view" />
            </div>
        </main>
    );
}

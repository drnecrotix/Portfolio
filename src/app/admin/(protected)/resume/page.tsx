import Link from 'next/link';
import { ExternalLink, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { normalizeResumeSettings, RESUME_CONFIG_SLUG } from '@/lib/resume-settings';
import { ResumeSettingsEditor } from '@/components/admin/ResumeSettingsEditor';

export const dynamic = 'force-dynamic';

export default async function ResumeAdminPage() {
    const page = await prisma.page.findUnique({
        where: { slug: RESUME_CONFIG_SLUG },
        select: { content: true, updatedAt: true },
    }).catch(() => null);
    const settings = normalizeResumeSettings(page?.content);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground"><FileText className="size-4" /> Public profile</div>
                    <h2 className="mt-1 text-3xl font-semibold">Career Dossier</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage the formal CV layer here. Experience and education still come from Journey, while identity data comes from Wiki and Site Settings.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/experience" className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Edit Journey data</Link>
                    <Link href="/resume/view" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open Web View <ExternalLink className="size-3.5" /></Link>
                    <Link href="/resume" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open Dossier <ExternalLink className="size-3.5" /></Link>
                </div>
            </div>
            <div className="mb-4 rounded-xl border border-sky-500/15 bg-sky-500/[0.04] px-4 py-3 text-xs leading-5 text-muted-foreground">Both selectors are PDF-only and include direct upload to Media Library. Use one PDF for Web View and Download CV, or keep separate versions when an application-specific document is needed.</div>
            <ResumeSettingsEditor initial={settings} updatedAt={page?.updatedAt.toISOString() ?? null} />
        </div>
    );
}

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { ExperienceAdminEditor } from '@/components/admin/ExperienceAdminEditor';
import { updateExperiencePage } from './actions';

const LEGACY_PAGE_TITLE = 'Experience page configuration';

export default async function ExperienceAdminPage() {
    const page = await prisma.page.findUnique({ where: { slug: '__experience-config' } });
    const content = normalizeExperienceContent(page?.content);
    const pageName = page?.title && page.title !== LEGACY_PAGE_TITLE ? page.title : 'Journey';

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col gap-5 md:mb-9 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{pageName}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Manage life events, education, professional milestones and the Partners & Sponsors showcase from a compact list-first editor. Changes save with AJAX without reloading the page.</p>
                </div>
                <Link href="/journey" target="_blank" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.04] hover:text-white">Preview /journey</Link>
            </div>

            <ExperienceAdminEditor content={content} pageName={pageName} action={updateExperiencePage} />
        </div>
    );
}

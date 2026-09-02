import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { ExperienceAdminEditor } from '@/components/admin/ExperienceAdminEditor';
import { updateExperiencePage } from './actions';

export default async function ExperienceAdminPage() {
    const page = await prisma.page.findUnique({ where: { slug: '__experience-config' } });
    const content = normalizeExperienceContent(page?.content);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Protected visual editor</p>
                    <h2 className="mt-2 text-4xl font-semibold">Experience</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Edit the public Experience page, its Education, Journey and Experience records, and the Partners & Sponsors showcase. Changes save with AJAX without reloading the admin page.</p>
                </div>
                <Link href="/experience" target="_blank" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.04] hover:text-white">Preview page</Link>
            </div>

            <ExperienceAdminEditor content={content} action={updateExperiencePage} />
        </div>
    );
}

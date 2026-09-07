import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { BlogSettingsEditor } from '@/components/admin/BlogSettingsEditor';
import { blogSettingsFromSiteEnvelope } from '@/lib/blog-settings';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function BlogSettingsPage({ searchParams }: { searchParams: SearchParams }) {
    const [raw, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { integrationSettings: true } }),
        searchParams,
    ]);
    const settings = blogSettingsFromSiteEnvelope(raw?.integrationSettings);

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Blog appearance saved and applied.' : undefined)} />
            <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Blog</p>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Journal appearance</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Customize the Blog landing-page heading, title animation and rotating phrases. Publication content and the protected FlowingMenu layout remain separate.</p>
                </div>
                <Link href="/admin/blog" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/10 px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground">Back to Blog</Link>
            </div>
            <BlogSettingsEditor initialSettings={settings} />
        </div>
    );
}

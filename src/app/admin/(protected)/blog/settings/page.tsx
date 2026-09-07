import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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
        <div className="mx-auto max-w-[1500px]">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Blog appearance saved and applied.' : undefined)} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 pb-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Blog / Settings</p>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">Journal appearance</h2>
                </div>
                <Link href="/admin/blog" className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3.5 py-2.5 text-xs text-muted-foreground transition hover:text-foreground"><ChevronLeft className="size-3.5" /> Back to Blog</Link>
            </div>
            <BlogSettingsEditor initialSettings={settings} />
        </div>
    );
}

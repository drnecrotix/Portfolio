import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { FooterSettingsWorkbench } from '@/components/admin/FooterSettingsWorkbench';
import { normalizeFooterSettings } from '@/lib/footer-settings';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function FooterAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [raw, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { footerContent: true } }),
        searchParams,
    ]);
    const settings = normalizeFooterSettings(raw?.footerContent);

    return (
        <div className="mx-auto max-w-[1500px]">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Footer settings saved and applied.' : undefined)} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">Appearance / Footer</p>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">Footer & More info</h2>
                </div>
                <p className="max-w-xl text-right text-[10px] leading-5 text-white/30">Content is editable. Protected layout, animation and responsive behavior stay unchanged.</p>
            </div>
            <FooterSettingsWorkbench initialSettings={settings} />
        </div>
    );
}

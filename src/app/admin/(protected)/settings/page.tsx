import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { normalizeManagedPageAccessSettings, PAGE_ACCESS_CONFIG_SLUG } from '@/lib/page-access';
import { GeneralSettingsWorkbench } from '@/components/admin/GeneralSettingsWorkbench';
import { StatusToast } from '@/components/admin/StatusToast';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; pageAccessSaved?: string; error?: string }> }) {
    const [raw, accessConfig, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.page.findUnique({ where: { slug: PAGE_ACCESS_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        searchParams,
    ]);
    const settings = normalizeGeneralSiteSettings(raw);
    const pageAccess = normalizeManagedPageAccessSettings(accessConfig?.content);
    const savedMessage = params.pageAccessSaved
        ? 'Page access settings saved and public routes refreshed.'
        : params.saved
            ? 'Settings saved and public cache refreshed.'
            : undefined;

    return (
        <div className="mx-auto max-w-[1500px]">
            <StatusToast type={params.error ? 'error' : savedMessage ? 'success' : undefined} message={params.error || savedMessage} />
            <GeneralSettingsWorkbench initialSettings={settings} initialAccess={pageAccess} />
        </div>
    );
}

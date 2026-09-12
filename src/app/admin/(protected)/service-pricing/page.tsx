import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';
import { normalizeWebsiteBuildBase, SERVICE_PRICING_CONFIG_SLUG, websiteBuildBaseWithDefaults } from '@/modules/service-requests/pricing-settings';
import { updateServicePricing } from './actions';

const labels: Record<string, string> = {
    'site-landing': 'Landing page', 'site-portfolio': 'Portfolio', 'site-business': 'Business website', 'site-blog': 'Blog / publication',
    'site-store': 'Online store', 'site-community': 'Community hub', 'site-recipes': 'Recipes / lifestyle', 'site-knowledge': 'Knowledge base',
    'site-courses': 'Courses / membership', 'site-booking': 'Bookings / events', 'site-directory': 'Directory', 'site-custom': 'Custom platform',
};

export default async function ServicePricingAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [config, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: SERVICE_PRICING_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        searchParams,
    ]);
    const prices = websiteBuildBaseWithDefaults(normalizeWebsiteBuildBase(config?.content));
    return <div className="mx-auto max-w-5xl"><StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Service prices saved and public pages refreshed.' : undefined)} /><header><p className="font-mono text-xs uppercase tracking-[0.18em] text-sky-400">Commerce</p><h1 className="mt-2 text-3xl font-black text-white">Service pricing</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Change the starting estimate ranges used by the website configurator. Prices are in EUR.</p></header><form action={updateServicePricing} className="mt-8"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 text-xs text-white/45"><tr><th className="py-3">Website type</th><th className="py-3">Minimum EUR</th><th className="py-3">Maximum EUR</th></tr></thead><tbody>{(Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType) as (keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType)[]).map((key) => <tr key={key} className="border-b border-white/10"><th className="py-4 pr-5 font-semibold text-white">{labels[key]}</th><td className="py-3 pr-4"><input name={`${key}-min`} type="number" min="0" max="50000" defaultValue={prices[key].min} className="w-full border border-white/15 bg-black/20 px-3 py-2 text-white" /></td><td className="py-3"><input name={`${key}-max`} type="number" min="0" max="50000" defaultValue={prices[key].max} className="w-full border border-white/15 bg-black/20 px-3 py-2 text-white" /></td></tr>)}</tbody></table></div><button className="mt-6 bg-sky-500 px-5 py-3 text-sm font-bold text-black">Save pricing</button></form></div>;
}

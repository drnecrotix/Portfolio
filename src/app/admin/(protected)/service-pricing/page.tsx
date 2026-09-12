import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';
import { SERVICE_PRICING } from '@/modules/service-requests/pricing';
import { normalizeServicePricing, SERVICE_PRICING_CONFIG_SLUG } from '@/modules/service-requests/pricing-settings';
import { updateServicePricing } from './actions';

const buildLabels: Record<string, string> = {
    'site-landing': 'Landing page', 'site-portfolio': 'Portfolio', 'site-business': 'Business website', 'site-blog': 'Blog / publication',
    'site-store': 'Online store', 'site-community': 'Community hub', 'site-recipes': 'Recipes / lifestyle', 'site-knowledge': 'Knowledge base',
    'site-courses': 'Courses / membership', 'site-booking': 'Bookings / events', 'site-directory': 'Directory', 'site-custom': 'Custom platform',
};
const inputClass = 'w-full border border-white/15 bg-black/20 px-3 py-2 text-white';

function RangeRows({ rows }: { rows: { id: string; name: string; min: number; max: number | null }[] }) {
    return <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-white/10"><th className="py-4 pr-5 font-semibold text-white">{row.name}</th><td className="py-3 pr-4"><input name={`${row.id}-min`} type="number" min="0" max="50000" defaultValue={row.min} className={inputClass} /></td><td className="py-3"><input name={`${row.id}-max`} type="number" min="0" max="50000" defaultValue={row.max ?? ''} placeholder={row.max === null ? 'No maximum' : undefined} className={inputClass} /></td></tr>)}</tbody>;
}

function FixedRows({ rows }: { rows: { id: string; name: string; price: number }[] }) {
    return <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-white/10"><th className="py-4 pr-5 font-semibold text-white">{row.name}</th><td className="py-3"><input name={`${row.id}-price`} type="number" min="0" max="50000" defaultValue={row.price} className={inputClass} /></td></tr>)}</tbody>;
}

function PricingSection({ title, detail, children, fixed = false }: { title: string; detail: string; children: React.ReactNode; fixed?: boolean }) {
    return <section className="mt-10"><h2 className="text-xl font-black text-white">{title}</h2><p className="mt-2 text-xs leading-5 text-white/45">{detail}</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-white/10 text-xs text-white/45"><tr><th className="py-3">Service</th>{fixed ? <th className="py-3">Price EUR</th> : <><th className="py-3">Minimum EUR</th><th className="py-3">Maximum EUR</th></>}</tr></thead>{children}</table></div></section>;
}

export default async function ServicePricingAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [config, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: SERVICE_PRICING_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        searchParams,
    ]);
    const prices = normalizeServicePricing(config?.content);
    const buildRows = (Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType) as (keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType)[]).map((id) => ({ id, name: buildLabels[id], min: prices.websiteBuildBase[id]!.min, max: prices.websiteBuildBase[id]!.max }));
    const oneOffRows = SERVICE_PRICING.oneOff.map((item) => ({ id: `oneoff-${item.id}`, name: item.name, ...prices.oneOff[item.id] }));
    const monthlyRows = SERVICE_PRICING.monthly.map((item) => ({ id: `monthly-${item.id}`, name: item.name, price: prices.monthly[item.id] }));
    const supportRows = SERVICE_PRICING.supportOneOff.map((item) => ({ id: `support-${item.id}`, name: item.name, ...prices.supportOneOff[item.id] }));
    const careRows = SERVICE_PRICING.supportMonthly.map((item) => ({ id: `care-${item.id}`, name: item.name, price: prices.supportMonthly[item.id] }));
    return <div className="mx-auto max-w-5xl"><StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Service prices saved and all related public services refreshed.' : undefined)} /><header><p className="font-mono text-xs uppercase tracking-[0.18em] text-sky-400">Commerce</p><h1 className="mt-2 text-3xl font-black text-white">Service pricing</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">Edit the complete public catalogue. Saved values are used by /services/pricing and the related estimators. Without saved overrides, the competitive default prices remain active.</p></header><form action={updateServicePricing} className="mt-8"><PricingSection title="Website creation" detail="Base estimate ranges used by Configure your website."><RangeRows rows={buildRows} /></PricingSection><PricingSection title="Audits and implementation" detail="Public one-off prices shown in the service catalogue."><RangeRows rows={oneOffRows} /></PricingSection><PricingSection title="SEO monitoring and growth" detail="Fixed monthly catalogue prices." fixed><FixedRows rows={monthlyRows} /></PricingSection><PricingSection title="One-off website support" detail="These ranges are also applied to matching tasks in Website Support."><RangeRows rows={supportRows} /></PricingSection><PricingSection title="Website maintenance" detail="Fixed monthly plans used in the catalogue and Website Support selector." fixed><FixedRows rows={careRows} /></PricingSection><div className="sticky bottom-4 mt-10 flex justify-end"><button className="bg-sky-500 px-6 py-3 text-sm font-bold text-black shadow-xl">Save all prices</button></div></form></div>;
}

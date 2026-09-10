import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICE_PRICING } from '@/modules/service-requests/pricing';

export const metadata: Metadata = {
    title: 'Service Pricing',
    description: 'Transparent EUR pricing for NecrotixLab and Kreatrics SEO, web health and remediation services, calibrated for the Bulgarian market.',
    alternates: { canonical: '/services/pricing' },
};

function oneOffPrice(item: (typeof SERVICE_PRICING.oneOff)[number]) {
    if (item.priceFrom === 0) return 'Free';
    if (item.priceTo === null) return `from €${item.priceFrom}`;
    if (item.priceFrom === item.priceTo) return `€${item.priceFrom}`;
    return `€${item.priceFrom}-€${item.priceTo}`;
}

export default function ServicePricingPage() {
    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                        <span className="text-sky-500">Kreatrics</span> / Service pricing / Bulgaria
                    </div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Service pricing</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Transparent EUR pricing positioned for the Bulgarian market. Automated NecrotixLab checks remain free; paid work starts when you request human review, implementation, ongoing monitoring or deeper SEO research.
                    </p>
                </header>

                <section className="mt-10 border-t border-border/80">
                    <div className="grid gap-2 border-b border-border/80 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                        <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">One-off</p><h2 className="mt-2 text-xl font-black tracking-tight">Audits & implementation</h2></div>
                        <p className="text-sm leading-6 text-muted-foreground">Good for a focused problem, a first SEO baseline or a defined remediation sprint without a recurring contract.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-left">
                            <thead className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                                <tr className="border-b border-border/70"><th className="py-3 pr-5">Service</th><th className="py-3 pr-5">Scope</th><th className="py-3 text-right">Price</th></tr>
                            </thead>
                            <tbody>
                                {SERVICE_PRICING.oneOff.map((item) => (
                                    <tr key={item.id} className="border-b border-border/60 align-top">
                                        <th className="py-4 pr-5 text-sm font-semibold">{item.name}</th>
                                        <td className="py-4 pr-5 text-xs leading-5 text-muted-foreground">{item.description}</td>
                                        <td className="whitespace-nowrap py-4 text-right font-mono text-sm font-bold">{oneOffPrice(item)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mt-12 border-t border-border/80">
                    <div className="grid gap-2 border-b border-border/80 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                        <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">Monthly</p><h2 className="mt-2 text-xl font-black tracking-tight">SEO monitoring & growth</h2></div>
                        <p className="text-sm leading-6 text-muted-foreground">Lower-cost recurring plans focused on measurement, technical follow-up and practical optimization rather than bundled media spend or paid link packages.</p>
                    </div>
                    <div className="grid border-b border-border/80 md:grid-cols-2 xl:grid-cols-4">
                        {SERVICE_PRICING.monthly.map((plan, index) => (
                            <article key={plan.id} className={`py-6 md:px-6 ${index ? 'border-t border-border/60 md:border-l md:border-t-0' : ''}`}>
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{plan.name}</p>
                                <p className="mt-2 text-3xl font-black tracking-[-0.04em]">€{plan.price}<span className="ml-1 text-xs font-semibold tracking-normal text-muted-foreground">/mo</span></p>
                                <p className="mt-3 text-xs leading-5 text-muted-foreground">{plan.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-10 grid gap-6 border-y border-border/80 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                        <h2 className="text-lg font-black tracking-tight">Clear scope before paid work starts</h2>
                        <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                            {SERVICE_PRICING.exclusions.map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                    </div>
                    <Link href="/contact" className="inline-flex items-center justify-center border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground">Request a quote</Link>
                </section>

                <footer className="mt-6 text-xs leading-5 text-muted-foreground">
                    <p>Market: {SERVICE_PRICING.market}. Currency: {SERVICE_PRICING.currency}. Pricing review: {SERVICE_PRICING.reviewedAt}. Automated estimates are indicative and the final scope is confirmed manually.</p>
                </footer>
            </div>
        </main>
    );
}

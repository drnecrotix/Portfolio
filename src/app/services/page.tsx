import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Globe2, HeartPulse, LifeBuoy } from 'lucide-react';
import { BackToLabLink } from '@/components/services/BackToLabLink';

export const metadata: Metadata = {
    title: 'Website Services',
    description: 'Inspect an existing website, configure a new project or request WordPress and custom website support.',
    alternates: { canonical: '/services' },
};

const services = [
    { href: '/services/website-inspector', icon: HeartPulse, eyebrow: 'Free Lab tool', title: 'Website Inspector', description: 'Check a public website for delivery, security headers, SEO basics, privacy signals, performance and WordPress hints.', accent: 'text-sky-500' },
    { href: '/services/website', icon: Globe2, eyebrow: 'Project configurator', title: 'Create a website', description: 'Choose the scope, design, features and infrastructure, then receive an immediate indicative EUR estimate.', accent: 'text-violet-500' },
    { href: '/services/support', icon: LifeBuoy, eyebrow: 'Ongoing or one-off help', title: 'Website support', description: 'Configure WordPress, WooCommerce or custom website support and maintenance with clear pricing.', accent: 'text-cyan-500' },
] as const;

export default function ServicesPage() {
    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <BackToLabLink />
                <header className="max-w-4xl">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-sky-500">Kreatrics / Services</div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Website services</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Start with a free inspection, configure a new website or request focused support for an existing WordPress or custom build.</p>
                </header>
                <section className="mt-10 grid border-t border-border/80 lg:grid-cols-3">
                    {services.map(({ href, icon: Icon, eyebrow, title, description, accent }) => (
                        <Link key={href} href={href} className="group border-b border-border/80 py-7 transition hover:bg-muted/30 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
                            <Icon className={`size-5 ${accent}`} />
                            <p className={`mt-8 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${accent}`}>{eyebrow}</p>
                            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{title}</h2>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                            <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold">Open service <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
                        </Link>
                    ))}
                </section>
                <Link href="/services/pricing" className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">View the complete EUR pricing catalogue <ArrowRight className="size-3.5" /></Link>
            </div>
        </main>
    );
}

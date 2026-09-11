import type { Metadata } from 'next';
import Link from 'next/link';
import { WebsiteOrderForm } from '@/components/service-requests/WebsiteOrderForm';

export const metadata: Metadata = {
    title: 'Website Project Configurator',
    description: 'Configure a new website project, see an indicative EUR estimate and create a trackable Kreatrics service request.',
    alternates: { canonical: '/services/website' },
};

export default function WebsiteProjectPage() {
    return <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36"><div className="mx-auto max-w-6xl"><header className="max-w-4xl"><div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">Kreatrics</span> / Website project</div><h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Configure your website</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Select the website type, size, design direction and functionality. The estimate updates instantly, and your submitted request receives a private status page for the review and final quote.</p><Link href="/services/pricing" className="mt-3 inline-block text-xs font-semibold text-sky-500 hover:underline">View the complete EUR pricing guide</Link></header><WebsiteOrderForm /></div></main>;
}

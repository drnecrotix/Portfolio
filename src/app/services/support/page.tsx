import type { Metadata } from 'next';
import Link from 'next/link';
import { WebsiteSupportForm } from '@/components/service-requests/WebsiteSupportForm';
import { BackToLabLink } from '@/components/services/BackToLabLink';

export const metadata: Metadata = {
    title: 'Website Support & Maintenance',
    description: 'Configure WordPress, WooCommerce or custom website support and receive an indicative EUR estimate.',
    alternates: { canonical: '/services/support' },
};

export default function WebsiteSupportPage() {
    return <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36"><div className="mx-auto max-w-6xl"><BackToLabLink /><header className="max-w-4xl"><div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-cyan-500">Kreatrics</span> / Website support</div><h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">WordPress & custom support</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Choose the platform, problem and preferred maintenance option. Receive an immediate indicative range and create a private, trackable support request.</p><Link href="/services/pricing#website-support" className="mt-3 inline-block text-xs font-semibold text-cyan-500 hover:underline">View the complete support price catalogue</Link></header><WebsiteSupportForm /></div></main>;
}

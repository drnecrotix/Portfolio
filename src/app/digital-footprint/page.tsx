import type { Metadata } from 'next';
import { DigitalFootprintClient } from '@/components/digital-footprint/DigitalFootprintClient';

export const metadata: Metadata = {
    title: 'Digital Footprint',
    description: 'Verify your email and audit the public accounts, breach exposure, domain posture and browser signals connected to your digital identity.',
    alternates: { canonical: '/digital-footprint' },
};

export default function DigitalFootprintPage() {
    return <DigitalFootprintClient />;
}

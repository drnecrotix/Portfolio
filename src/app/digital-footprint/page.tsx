import type { Metadata } from 'next';
import { DigitalFootprintClient } from '@/components/digital-footprint/DigitalFootprintClient';

export const metadata: Metadata = {
    title: 'Digital Footprint',
    description: 'Check an email address, phone number or username for public account and breach-exposure signals without an email verification step.',
    alternates: { canonical: '/digital-footprint' },
};

export default function DigitalFootprintPage() {
    return <DigitalFootprintClient />;
}

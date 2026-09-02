import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'The Lab',
    description: 'Capabilities, technologies, systems and tools behind what I build.',
    alternates: { canonical: '/lab' },
    robots: { index: false, follow: true },
};

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
    return children;
}

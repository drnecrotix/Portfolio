import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const [projects, posts, drafts, settings, siteMode] = await Promise.all([
        prisma.project.count(),
        prisma.post.count(),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.siteModeSettings.findUnique({ where: { id: 'default' } }),
    ]);

    const cards = [
        ['Projects', projects],
        ['Posts', posts],
        ['Drafts', drafts],
        ['Site mode', siteMode?.mode ?? 'NORMAL'],
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Control center</p>
                    <h2 className="text-4xl font-semibold mt-2">Dashboard</h2>
                </div>
                <p className="text-sm text-white/40">{settings?.siteName ?? 'Dr Necrotix'}</p>
            </div>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
                        <p className="text-3xl font-semibold mt-4">{value}</p>
                    </div>
                ))}
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                <h3 className="text-xl font-semibold">CMS foundation active</h3>
                <p className="mt-3 text-white/50 max-w-2xl leading-relaxed">
                    The admin shell is connected to PostgreSQL through Prisma. Site Mode, Projects, Blog,
                    Homepage, Pages, Navigation, Media, SEO, Redirects and Users will be implemented as
                    separate modules without changing the protected public portfolio design.
                </p>
            </section>
        </div>
    );
}

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getIntegrationTests, hasStoredIntegrationValue } from '@/lib/integration-credentials';
import { DataForSeoIntegrationCard } from '@/components/admin/DataForSeoIntegrationCard';

type Source = 'cms' | 'environment' | 'missing';

function source(settings: unknown, id: string, envName: string): Source {
    if (hasStoredIntegrationValue(settings, id)) return 'cms';
    if (String(process.env[envName] ?? '').trim()) return 'environment';
    return 'missing';
}

export default async function ApiIntegrationsLayout({ children }: { children: ReactNode }) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { integrationSettings: true },
    });
    const integrationSettings = settings?.integrationSettings;
    const loginSource = source(integrationSettings, 'dataforseo.login', 'DATAFORSEO_LOGIN');
    const passwordSource = source(integrationSettings, 'dataforseo.password', 'DATAFORSEO_PASSWORD');
    const tests = getIntegrationTests(integrationSettings);

    return (
        <div className="space-y-7">
            {children}
            <DataForSeoIntegrationCard
                loginConfigured={loginSource !== 'missing'}
                passwordConfigured={passwordSource !== 'missing'}
                loginSource={loginSource}
                passwordSource={passwordSource}
                lastTest={tests.dataforseo ?? null}
            />
        </div>
    );
}

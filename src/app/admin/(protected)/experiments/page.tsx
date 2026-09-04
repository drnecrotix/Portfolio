import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ExperimentsDashboard } from '@/components/admin/ExperimentsDashboard';

export const dynamic = 'force-dynamic';

export default async function ExperimentsPage() {
    const session = await auth();
    if (!session?.user) redirect('/admin/login');
    if (!['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    return <ExperimentsDashboard />;
}

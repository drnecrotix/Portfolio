import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { updateFootprintSettings } from './actions';

export default async function DigitalFootprintAdminPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string; error?: string }>;
}) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const [settings, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { integrationSettings: true } }),
        searchParams,
    ]);
    const raw = settings?.integrationSettings;
    const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const botCheckEnabled = !(obj['footprint.botCheckEnabled'] === false || obj['footprint.botCheckEnabled'] === 'false');

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Digital Footprint settings saved.' : undefined)} />
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Tools</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Digital Footprint</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                    Control public lookup behaviour for the Digital Footprint tool. Provider API keys remain under API Integrations.
                </p>
            </div>

            <form action={updateFootprintSettings} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-white">Bot check</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                    When enabled, visitors must solve a short math challenge before running a scan. Disable only if you accept higher automated traffic risk.
                </p>
                <label className="mt-5 flex items-start gap-3 text-sm text-white/80">
                    <input type="checkbox" name="botCheckEnabled" defaultChecked={botCheckEnabled} className="mt-1 size-4 rounded border-white/20 bg-black/40" />
                    <span>
                        <span className="font-medium text-white">Require bot check on public scans</span>
                        <span className="mt-1 block text-xs text-white/45">Default: enabled. Stored in site integration settings (`footprint.botCheckEnabled`).</span>
                    </span>
                </label>
                <button type="submit" className="mt-6 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-sky-400">
                    Save settings
                </button>
            </form>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                <p className="font-medium text-white/80">Coverage notes</p>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                    <li>Username scans check GitHub, GitLab, Codeberg, Reddit, DEV, Keybase, Hacker News, npm, PyPI, Docker Hub, Hugging Face, Bitbucket and SourceHut.</li>
                    <li>Email scans include breaches (HIBP, LeakCheck, XposedOrNot), Holehe, EmailRep, Gravatar, GitHub/GitLab email search and domain mail posture.</li>
                    <li>Results surface full exposed field maps and a related-accounts list when public profiles are found.</li>
                </ul>
            </div>
        </div>
    );
}

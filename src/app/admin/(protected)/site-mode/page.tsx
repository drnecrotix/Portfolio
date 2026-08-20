import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { formatSofiaDateTimeLocal, parseSofiaDateTimeLocal } from '@/lib/sofia-time';

const modes = ['NORMAL', 'MAINTENANCE', 'COMING_SOON', 'PRIVATE', 'ARCHIVE'] as const;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1_500;
const MIN_PRIVATE_PASSWORD_LENGTH = 12;
const MAX_PRIVATE_PASSWORD_LENGTH = 200;

function boundedText(value: FormDataEntryValue | null, max: number, label: string) {
    const text = String(value ?? '').trim();
    if (text.length > max) throw new Error(`${label} is too long.`);
    return text || null;
}

async function updateSiteMode(formData: FormData) {
    'use server';

    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    let destination = '/admin/site-mode?saved=1';

    try {
        const mode = String(formData.get('mode') || 'NORMAL');
        if (!modes.includes(mode as (typeof modes)[number])) throw new Error('Invalid site mode.');

        const parseDate = (key: string) => {
            const raw = String(formData.get(key) || '').trim();
            if (!raw) return null;
            const parsed = parseSofiaDateTimeLocal(raw);
            if (!parsed || Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${key} date.`);
            return parsed;
        };

        const startsAt = parseDate('startsAt');
        const endsAt = parseDate('endsAt');
        const countdownTarget = parseDate('countdownTarget');
        if (startsAt && endsAt && endsAt <= startsAt) throw new Error('End time must be after start time.');
        if (countdownTarget && startsAt && countdownTarget < startsAt) throw new Error('Countdown target cannot be before the scheduled start.');

        const current = await prisma.siteModeSettings.findUnique({ where: { id: 'default' } });
        const password = String(formData.get('privatePassword') || '');
        const clearPassword = formData.get('clearPrivatePassword') === 'on';

        if (password.length > MAX_PRIVATE_PASSWORD_LENGTH) throw new Error('Private password is too long.');
        if (password && password.length < MIN_PRIVATE_PASSWORD_LENGTH) {
            throw new Error(`Private passwords must contain at least ${MIN_PRIVATE_PASSWORD_LENGTH} characters.`);
        }
        if (clearPassword && password) throw new Error('Choose either a replacement password or clear the existing password.');

        const passwordHash = clearPassword ? null : password ? await hash(password, 12) : current?.passwordHash ?? null;
        if (mode === 'PRIVATE' && !passwordHash) throw new Error('Private mode requires an access password.');

        const data = {
            mode: mode as (typeof modes)[number],
            startsAt,
            endsAt,
            bypassAdmins: formData.get('bypassAdmins') === 'on',
            passwordHash,
            title: boundedText(formData.get('title'), MAX_TITLE_LENGTH, 'Title'),
            message: boundedText(formData.get('message'), MAX_MESSAGE_LENGTH, 'Message'),
            countdownTarget,
            showSocials: formData.get('showSocials') === 'on',
            showContact: formData.get('showContact') === 'on',
        };

        await prisma.siteModeSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
        revalidatePath('/', 'layout');
        revalidatePath('/admin/site-mode');
        revalidatePath('/site-status');
    } catch (error) {
        destination = `/admin/site-mode?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to apply Site Mode settings.')}`;
    }

    redirect(destination);
}

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function SiteModeAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const session = await auth();
    const canManage = !!session?.user && ['OWNER', 'ADMIN'].includes(session.user.role);
    const [settings, params] = await Promise.all([
        prisma.siteModeSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } }),
        searchParams,
    ]);

    return (
        <div className="max-w-5xl">
            <StatusToast
                type={params.error ? 'error' : params.saved ? 'success' : undefined}
                message={params.error || (params.saved ? 'Site Mode settings saved and applied.' : undefined)}
            />

            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Site control</p>
                <h1 className="text-4xl font-semibold">Site Mode</h1>
                <p className="mt-3 max-w-2xl text-white/50">Control public availability without changing or rebuilding the protected portfolio design.</p>
            </div>

            <form action={updateSiteMode} className="space-y-8">
                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <h2 className="text-lg font-semibold mb-5">Mode</h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {modes.map((mode) => (
                            <label key={mode} className="cursor-pointer">
                                <input type="radio" name="mode" value={mode} defaultChecked={settings.mode === mode} disabled={!canManage} className="peer sr-only" />
                                <span className="block rounded-xl border border-white/10 px-4 py-4 text-sm text-white/60 transition peer-checked:border-white/60 peer-checked:bg-white peer-checked:text-black">{mode.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-5">
                        <div>
                            <h2 className="text-lg font-semibold">Schedule</h2>
                            <p className="mt-1 text-xs text-white/35">Times are interpreted in Europe/Sofia, including daylight-saving time.</p>
                        </div>
                        <label className="block"><span className="text-sm text-white/50">Starts at</span><input name="startsAt" type="datetime-local" defaultValue={formatSofiaDateTimeLocal(settings.startsAt)} disabled={!canManage} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></label>
                        <label className="block"><span className="text-sm text-white/50">Ends at</span><input name="endsAt" type="datetime-local" defaultValue={formatSofiaDateTimeLocal(settings.endsAt)} disabled={!canManage} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></label>
                        <label className="block"><span className="text-sm text-white/50">Countdown target</span><input name="countdownTarget" type="datetime-local" defaultValue={formatSofiaDateTimeLocal(settings.countdownTarget)} disabled={!canManage} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" /></label>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-5">
                        <h2 className="text-lg font-semibold">Public message</h2>
                        <label className="block"><span className="text-sm text-white/50">Title</span><input name="title" maxLength={MAX_TITLE_LENGTH} defaultValue={settings.title ?? ''} disabled={!canManage} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" placeholder="Temporarily offline" /></label>
                        <label className="block"><span className="text-sm text-white/50">Message</span><textarea name="message" maxLength={MAX_MESSAGE_LENGTH} rows={5} defaultValue={settings.message ?? ''} disabled={!canManage} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3" placeholder="A short message for visitors." /></label>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold">Private access</h2>
                        <p className="mt-1 text-xs text-white/35">{settings.passwordHash ? 'A private access password is configured.' : 'No private access password is configured.'}</p>
                    </div>
                    <label className="block max-w-xl"><span className="text-sm text-white/50">Set / replace password</span><input name="privatePassword" type="password" minLength={MIN_PRIVATE_PASSWORD_LENGTH} maxLength={MAX_PRIVATE_PASSWORD_LENGTH} autoComplete="new-password" disabled={!canManage} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" placeholder="Leave blank to keep current password" /></label>
                    <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="clearPrivatePassword" disabled={!canManage} /> Clear configured password</label>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <h2 className="text-lg font-semibold mb-5">Behavior</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="bypassAdmins" defaultChecked={settings.bypassAdmins} disabled={!canManage} /> Allow admin bypass</label>
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="showSocials" defaultChecked={settings.showSocials} disabled={!canManage} /> Show social links</label>
                        <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="showContact" defaultChecked={settings.showContact} disabled={!canManage} /> Show contact action</label>
                    </div>
                </section>

                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white/40">Current mode: <span className="text-white/80">{settings.mode}</span></p>
                    {canManage ? <button type="submit" className="rounded-xl bg-white px-5 py-3 font-semibold text-black">Save Site Mode</button> : <p className="text-sm text-amber-300/70">Editor role is read-only for Site Mode.</p>}
                </div>
            </form>
        </div>
    );
}

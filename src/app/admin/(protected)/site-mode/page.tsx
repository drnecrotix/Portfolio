import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { resolveSiteMode } from '@/lib/site-mode';
import { formatSofiaDateTimeLocal, parseSofiaDateTimeLocal } from '@/lib/sofia-time';

const modes = ['NORMAL', 'MAINTENANCE', 'COMING_SOON', 'PRIVATE', 'ARCHIVE'] as const;
const modeHelp: Record<(typeof modes)[number], string> = {
    NORMAL: 'Public site is available normally.',
    MAINTENANCE: 'Temporarily replace the site while maintenance is in progress.',
    COMING_SOON: 'Show a launch-focused holding page before the public release.',
    PRIVATE: 'Require a password before visitors can enter the site.',
    ARCHIVE: 'Preserve the current edition as intentionally unavailable.',
};
const templates = [
    { id: 'hero', name: 'Hero', description: 'Oversized typography, dotted grid and status panel.', tone: 'Classic' },
    { id: 'split', name: 'Split', description: 'Asymmetric editorial composition with a separate information panel.', tone: 'Editorial' },
    { id: 'editorial', name: 'Editorial', description: 'Framed high-impact layout with large status lettering.', tone: 'Preserved' },
    { id: 'signal', name: 'Signal', description: 'Centered modern launch/status screen with a subtle animated signal.', tone: 'New' },
    { id: 'portal', name: 'Portal', description: 'Modern two-panel composition with strong typography and clean status controls.', tone: 'New' },
] as const;
const templateIds = templates.map((template) => template.id);
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1_500;
const MIN_PRIVATE_PASSWORD_LENGTH = 12;
const MAX_PRIVATE_PASSWORD_LENGTH = 200;
const field = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5 disabled:opacity-50';
const card = 'rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-6';

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
        const template = String(formData.get('template') || 'hero');
        if (!templateIds.includes(template as (typeof templateIds)[number])) throw new Error('Invalid Site Mode template.');

        const parseDate = (key: string) => {
            const raw = String(formData.get(key) || '').trim();
            if (!raw) return null;
            const parsed = parseSofiaDateTimeLocal(raw);
            if (!parsed || Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${key} date.`);
            return parsed;
        };

        const startsAt = parseDate('startsAt');
        const endsAt = parseDate('endsAt');
        if (startsAt && endsAt && endsAt <= startsAt) throw new Error('End time must be after start time.');
        if (!startsAt && endsAt && endsAt <= new Date()) throw new Error('End time must be in the future when Site Mode starts immediately.');

        const current = await prisma.siteModeSettings.findUnique({ where: { id: 'default' } });
        const password = String(formData.get('privatePassword') || '');
        const clearPassword = formData.get('clearPrivatePassword') === 'on';

        if (password.length > MAX_PRIVATE_PASSWORD_LENGTH) throw new Error('Private password is too long.');
        if (password && password.length < MIN_PRIVATE_PASSWORD_LENGTH) throw new Error(`Private passwords must contain at least ${MIN_PRIVATE_PASSWORD_LENGTH} characters.`);
        if (clearPassword && password) throw new Error('Choose either a replacement password or clear the existing password.');

        const passwordHash = clearPassword ? null : password ? await hash(password, 12) : current?.passwordHash ?? null;
        if (mode === 'PRIVATE' && !passwordHash) throw new Error('Private mode requires an access password.');

        const data = {
            mode: mode as (typeof modes)[number],
            template,
            startsAt,
            endsAt,
            bypassAdmins: formData.get('bypassAdmins') === 'on',
            passwordHash,
            title: boundedText(formData.get('title'), MAX_TITLE_LENGTH, 'Title'),
            message: boundedText(formData.get('message'), MAX_MESSAGE_LENGTH, 'Message'),
            countdownTarget: endsAt,
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
    const effective = resolveSiteMode(settings);

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Site Mode settings saved and applied.' : undefined)} />

            <div className="mb-8 sm:mb-10">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Site control</p>
                <h1 className="text-3xl font-semibold sm:text-4xl">Site Mode</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Control public availability, scheduling and presentation. Split and Editorial remain available; Signal and Portal add newer launch/status options.</p>
            </div>

            <form action={updateSiteMode} className="space-y-6">
                <section className={card}>
                    <div className="mb-5"><h2 className="text-lg font-semibold">Mode</h2><p className="mt-1 text-xs text-muted-foreground">Choose what visitors should see.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {modes.map((mode) => (
                            <label key={mode} className="cursor-pointer">
                                <input type="radio" name="mode" value={mode} defaultChecked={settings.mode === mode} disabled={!canManage} className="peer sr-only" />
                                <span className="block min-h-28 rounded-xl border border-foreground/10 bg-background/50 p-4 text-sm transition peer-checked:border-foreground/45 peer-checked:bg-foreground peer-checked:text-background">
                                    <strong className="block text-xs uppercase tracking-wider">{mode.replace('_', ' ')}</strong>
                                    <span className="mt-2 block text-xs leading-5 opacity-65">{modeHelp[mode]}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className={card}>
                    <div className="mb-5"><h2 className="text-lg font-semibold">Template</h2><p className="mt-1 text-xs text-muted-foreground">Used by Maintenance, Coming Soon, Private and Archive. Signal and Portal are especially suited to Coming Soon.</p></div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {templates.map((template) => (
                            <label key={template.id} className="group cursor-pointer">
                                <input type="radio" name="template" value={template.id} defaultChecked={(settings.template || 'hero') === template.id} disabled={!canManage} className="peer sr-only" />
                                <span className="relative block min-h-44 overflow-hidden rounded-2xl border border-foreground/10 bg-background/60 p-5 transition peer-checked:border-primary/50 peer-checked:bg-primary/[0.05]">
                                    <span className="absolute inset-0 bg-[radial-gradient(circle,_currentColor_0.5px,_transparent_0.5px)] opacity-[0.04] [background-size:18px_18px]" />
                                    <span className="relative flex h-full flex-col justify-between">
                                        <span><span className="inline-flex rounded-full border border-foreground/10 px-2 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">{template.tone}</span><strong className="mt-4 block text-xl tracking-tight">{template.name}</strong></span>
                                        <span className="mt-7 block text-xs leading-relaxed text-muted-foreground">{template.description}</span>
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className={`${card} space-y-5`}>
                        <div><h2 className="text-lg font-semibold">Schedule</h2><p className="mt-1 text-xs text-muted-foreground">Europe/Sofia time. Empty start = activate immediately; empty end = remain active until changed.</p></div>
                        <label className="block"><span className="text-sm text-muted-foreground">Starts at <span className="opacity-60">(optional)</span></span><input name="startsAt" type="datetime-local" defaultValue={formatSofiaDateTimeLocal(settings.startsAt)} disabled={!canManage} className={field} /></label>
                        <label className="block"><span className="text-sm text-muted-foreground">Ends at <span className="opacity-60">(optional)</span></span><input name="endsAt" type="datetime-local" defaultValue={formatSofiaDateTimeLocal(settings.endsAt)} disabled={!canManage} className={field} /></label>
                        <div className="rounded-xl border border-foreground/10 bg-background/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">{settings.endsAt ? `Countdown runs automatically until ${settings.endsAt.toLocaleString('en-GB', { timeZone: 'Europe/Sofia' })}.` : 'No end date is set, so no countdown will be displayed.'}</div>
                    </div>

                    <div className={`${card} space-y-5`}>
                        <div><h2 className="text-lg font-semibold">Public message</h2><p className="mt-1 text-xs text-muted-foreground">Leave fields blank to use the selected mode defaults.</p></div>
                        <label className="block"><span className="text-sm text-muted-foreground">Title</span><input name="title" maxLength={MAX_TITLE_LENGTH} defaultValue={settings.title ?? ''} disabled={!canManage} className={field} placeholder="Template default" /></label>
                        <label className="block"><span className="text-sm text-muted-foreground">Message</span><textarea name="message" maxLength={MAX_MESSAGE_LENGTH} rows={5} defaultValue={settings.message ?? ''} disabled={!canManage} className={`${field} resize-y`} placeholder="Template default" /></label>
                    </div>
                </section>

                <details className={card} open={settings.mode === 'PRIVATE'}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden"><div><h2 className="text-lg font-semibold">Private access</h2><p className="mt-1 text-xs text-muted-foreground">{settings.passwordHash ? 'A private access password is configured.' : 'No private access password is configured.'}</p></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Security</span></summary>
                    <div className="mt-5 space-y-5 border-t border-foreground/10 pt-5">
                        <label className="block max-w-xl"><span className="text-sm text-muted-foreground">Set / replace password</span><input name="privatePassword" type="password" minLength={MIN_PRIVATE_PASSWORD_LENGTH} maxLength={MAX_PRIVATE_PASSWORD_LENGTH} autoComplete="new-password" disabled={!canManage} className={field} placeholder="Leave blank to keep current password" /></label>
                        <label className="flex items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" name="clearPrivatePassword" disabled={!canManage} /> Clear configured password</label>
                    </div>
                </details>

                <section className={card}>
                    <h2 className="mb-5 text-lg font-semibold">Behavior</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-foreground/10 bg-background/50 px-4 text-sm text-muted-foreground"><input type="checkbox" name="bypassAdmins" defaultChecked={settings.bypassAdmins} disabled={!canManage} /> Allow admin bypass</label>
                        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-foreground/10 bg-background/50 px-4 text-sm text-muted-foreground"><input type="checkbox" name="showSocials" defaultChecked={settings.showSocials} disabled={!canManage} /> Show social links</label>
                        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-foreground/10 bg-background/50 px-4 text-sm text-muted-foreground"><input type="checkbox" name="showContact" defaultChecked={settings.showContact} disabled={!canManage} /> Show contact action</label>
                    </div>
                </section>

                <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground sm:text-sm">Configured: <span className="font-medium text-foreground">{settings.mode}</span> · Effective: <span className={effective.mode === settings.mode ? 'text-emerald-500' : 'text-amber-500'}>{effective.mode}</span> · Template: <span className="font-medium text-foreground">{settings.template || 'hero'}</span></div>
                    {canManage ? <button type="submit" className="rounded-xl bg-foreground px-5 py-3 font-semibold text-background">Save Site Mode</button> : <p className="text-sm text-amber-500">Editor role is read-only for Site Mode.</p>}
                </div>
            </form>
        </div>
    );
}

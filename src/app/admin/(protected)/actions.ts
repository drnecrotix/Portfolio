'use server';

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

const appRoot = process.cwd();

async function requireAdmin(ownerOnly = false) {
    const session = await auth();
    const allowed = ownerOnly ? session?.user?.role === 'OWNER' : ['OWNER', 'ADMIN'].includes(session?.user?.role || '');
    if (!session?.user || !allowed) throw new Error('Forbidden');
}

export async function purgeApplicationCache() {
    let destination = '/admin?cache=purged';
    try {
        await requireAdmin();
        revalidatePath('/', 'layout');
        for (const path of ['/projects', '/blog', '/contact', '/admin']) revalidatePath(path);
    } catch (error) {
        destination = `/admin?error=${encodeURIComponent(error instanceof Error ? error.message : 'Cache purge failed.')}`;
    }
    redirect(destination);
}

export async function checkForPortfolioUpdate() {
    let destination = '/admin?update=checked';
    try {
        await requireAdmin();
        const local = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as { version?: string };
        const response = await fetch('https://raw.githubusercontent.com/drnecrotix/Portfolio/main/package.json', { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
        const remote = await response.json() as { version?: string };
        const localVersion = local.version || 'unknown';
        const remoteVersion = remote.version || 'unknown';
        destination = `/admin?localVersion=${encodeURIComponent(localVersion)}&remoteVersion=${encodeURIComponent(remoteVersion)}&update=${localVersion === remoteVersion ? 'current' : 'available'}`;
    } catch (error) {
        destination = `/admin?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to check GitHub for updates.')}`;
    }
    redirect(destination);
}

export async function installPortfolioUpdate() {
    let destination = '/admin?update=started';
    try {
        await requireAdmin(true);
        const script = join(appRoot, 'scripts', 'self-update.mjs');
        if (!existsSync(script)) throw new Error('Update worker is missing from this deployment.');
        const tmp = join(appRoot, 'tmp');
        mkdirSync(tmp, { recursive: true });
        writeFileSync(join(tmp, 'update-status.json'), JSON.stringify({ state: 'starting', message: 'Update worker is starting…', updatedAt: new Date().toISOString() }, null, 2));
        const child = spawn(process.execPath, [script], { cwd: appRoot, env: process.env, detached: true, stdio: 'ignore' });
        child.unref();
    } catch (error) {
        destination = `/admin?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to start update.')}`;
    }
    redirect(destination);
}

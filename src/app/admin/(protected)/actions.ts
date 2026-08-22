'use server';

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { installedPortfolioVersion } from '@/lib/installed-version';

const appRoot = process.cwd();
const portfolioPackageApiUrl = 'https://api.github.com/repos/drnecrotix/Portfolio/contents/package.json?ref=main';
const portfolioPackageRawUrl = 'https://raw.githubusercontent.com/drnecrotix/Portfolio/main/package.json';

async function requireAdmin(ownerOnly = false) {
    const session = await auth();
    const allowed = ownerOnly ? session?.user?.role === 'OWNER' : ['OWNER', 'ADMIN'].includes(session?.user?.role || '');
    if (!session?.user || !allowed) throw new Error('Forbidden');
}

async function readRemotePackage(url: string, headers?: HeadersInit) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}_=${Date.now()}`, {
        cache: 'no-store',
        headers,
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
    return await response.json() as { version?: string };
}

async function latestPortfolioVersion() {
    let lastError: unknown;

    try {
        const remote = await readRemotePackage(portfolioPackageApiUrl, {
            Accept: 'application/vnd.github.raw+json',
            'User-Agent': 'Dr-Necrotix-Portfolio-Updater',
        });
        if (remote.version) return remote.version;
        throw new Error('GitHub API package version is missing.');
    } catch (error) {
        lastError = error;
    }

    try {
        const remote = await readRemotePackage(portfolioPackageRawUrl, {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        });
        if (remote.version) return remote.version;
        throw new Error('GitHub raw package version is missing.');
    } catch (error) {
        lastError = error;
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to read the latest Portfolio version from GitHub.');
}

export async function purgeApplicationCache() {
    let destination = '/admin?cache=purged';
    try {
        await requireAdmin();
        revalidatePath('/', 'layout');
        for (const path of [
            '/',
            '/projects',
            '/blog',
            '/gallery',
            '/experience',
            '/achievements',
            '/resume',
            '/contact',
            '/sitemap.xml',
            '/rss.xml',
            '/robots.txt',
            '/admin',
        ]) revalidatePath(path);
    } catch (error) {
        destination = `/admin?error=${encodeURIComponent(error instanceof Error ? error.message : 'Cache purge failed.')}`;
    }
    redirect(destination);
}

export async function checkForPortfolioUpdate() {
    try {
        await requireAdmin();
        const [remoteVersion, localVersion] = await Promise.all([
            latestPortfolioVersion(),
            Promise.resolve(installedPortfolioVersion()),
        ]);
        const available = localVersion !== remoteVersion;
        return {
            ok: true,
            state: available ? 'available' as const : 'current' as const,
            message: available ? `Update available: ${localVersion} → ${remoteVersion}.` : `Portfolio ${localVersion} is up to date.`,
            localVersion,
            remoteVersion,
        };
    } catch (error) {
        return {
            ok: false,
            state: 'error' as const,
            message: error instanceof Error ? error.message : 'Unable to check GitHub for updates.',
        };
    }
}

export async function installPortfolioUpdate() {
    try {
        await requireAdmin(true);

        const localVersion = installedPortfolioVersion();
        const remoteVersion = await latestPortfolioVersion();
        if (localVersion === remoteVersion) {
            return {
                ok: false,
                state: 'current' as const,
                message: `Portfolio ${localVersion} is already up to date.`,
            };
        }

        const script = join(appRoot, 'scripts', 'self-update.mjs');
        if (!existsSync(script)) throw new Error('Update worker is missing from this deployment.');
        const tmp = join(appRoot, 'tmp');
        mkdirSync(tmp, { recursive: true });
        const initialStatus = {
            state: 'starting',
            message: `Update worker is starting for Portfolio ${remoteVersion}…`,
            updatedAt: new Date().toISOString(),
            targetVersion: remoteVersion,
        };
        writeFileSync(join(tmp, 'update-status.json'), JSON.stringify(initialStatus, null, 2));
        const child = spawn(process.execPath, [script], { cwd: appRoot, env: process.env, detached: true, stdio: 'ignore' });
        child.unref();
        return { ok: true, state: 'starting' as const, message: initialStatus.message };
    } catch (error) {
        return {
            ok: false,
            state: 'error' as const,
            message: error instanceof Error ? error.message : 'Unable to start update.',
        };
    }
}

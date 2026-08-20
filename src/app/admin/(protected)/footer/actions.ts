'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { FooterLinkSetting, FooterSettings } from '@/lib/footer-settings';

function field(form: FormData, key: string, max = 500) {
    const value = String(form.get(key) ?? '').trim();
    if (value.length > max) throw new Error(`${key} is too long.`);
    return value;
}

function validUrl(value: string, allowLocal = true) {
    if (!value) return '';
    if (allowLocal && value.startsWith('/') && !value.startsWith('//')) return value;
    const parsed = new URL(value);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Footer links must use a local path, HTTP(S), or mailto URL.');
    }
    return parsed.toString();
}

function readLinks(form: FormData, prefix: string, count: number): FooterLinkSetting[] {
    const result: FooterLinkSetting[] = [];
    for (let index = 0; index < count; index += 1) {
        const label = field(form, `${prefix}Label${index}`, 80);
        const hrefRaw = field(form, `${prefix}Href${index}`, 2048);
        if (!label && !hrefRaw) continue;
        if (!label || !hrefRaw) throw new Error(`${prefix} link ${index + 1} needs both a label and URL.`);
        result.push({ label, href: validUrl(hrefRaw) });
    }
    return result;
}

function assertTimezone(value: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    } catch {
        throw new Error('Footer timezone is invalid.');
    }
}

export async function updateFooterSettings(form: FormData) {
    let destination = '/admin/footer?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

        const timezone = field(form, 'timezone', 100) || 'Europe/Sofia';
        assertTimezone(timezone);

        const email = field(form, 'email', 254);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Footer email is invalid.');

        const footerContent: FooterSettings = {
            compactName: field(form, 'compactName', 120) || 'Dr Necrotix.',
            compactSecondary: field(form, 'compactSecondary', 120) || 'All rights reserved.',
            moreLabel: field(form, 'moreLabel', 60) || 'More info',
            linksHeading: field(form, 'linksHeading', 60) || 'Links',
            socialsHeading: field(form, 'socialsHeading', 60) || 'Social',
            localTimeHeading: field(form, 'localTimeHeading', 60) || 'Local time',
            versionHeading: field(form, 'versionHeading', 60) || 'Version',
            editionText: field(form, 'editionText', 120) || '2026 © Edition',
            brandText: field(form, 'brandText', 120) || 'DR NECROTIX',
            timezone,
            locationText: field(form, 'locationText', 160) || 'Bulgaria',
            locationUrl: validUrl(field(form, 'locationUrl', 2048)),
            email,
            githubUrl: validUrl(field(form, 'githubUrl', 2048), false),
            linkedinUrl: validUrl(field(form, 'linkedinUrl', 2048), false),
            instagramUrl: validUrl(field(form, 'instagramUrl', 2048), false),
            workspaceUrl: validUrl(field(form, 'workspaceUrl', 2048)),
            marquee: Array.from({ length: 6 }, (_, index) => field(form, `marquee${index}`, 120)).filter(Boolean),
            quickLinks: readLinks(form, 'quick', 6),
            aboutLabel: field(form, 'aboutLabel', 80) || 'About',
            aboutLinks: readLinks(form, 'about', 8),
        };

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', footerContent },
            update: { footerContent },
        });

        revalidatePath('/', 'layout');
        revalidatePath('/admin/footer');
        revalidatePath('/api/footer-settings');
    } catch (error) {
        destination = `/admin/footer?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save footer settings.')}`;
    }
    redirect(destination);
}

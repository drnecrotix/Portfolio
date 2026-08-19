'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function field(form: FormData, key: string) {
    return String(form.get(key) ?? '').trim();
}

function urlOrEmpty(value: string) {
    if (!value) return '';
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP/HTTPS URLs are allowed.');
    return parsed.toString();
}

export async function updateGeneralSettings(form: FormData) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

    const siteName = field(form, 'siteName');
    const siteDescription = field(form, 'siteDescription');
    const defaultTheme = field(form, 'defaultTheme') === 'light' ? 'light' : 'dark';
    const allowDayMode = form.has('allowDayMode');
    const locale = field(form, 'locale') || 'en';
    const timezone = field(form, 'timezone') || 'Europe/Sofia';
    const accentColor = field(form, 'accentColor');

    if (!siteName) throw new Error('Site name is required.');

    const socialLinks = {
        github: urlOrEmpty(field(form, 'github')),
        instagram: urlOrEmpty(field(form, 'instagram')),
        linkedin: urlOrEmpty(field(form, 'linkedin')),
        twitter: urlOrEmpty(field(form, 'twitter')),
        discord: urlOrEmpty(field(form, 'discord')),
        spotify: urlOrEmpty(field(form, 'spotify')),
    };

    const contactDetails = {
        email: field(form, 'email'),
        phone: field(form, 'phone'),
        location: field(form, 'location'),
        website: urlOrEmpty(field(form, 'website')),
    };

    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: {
            id: 'default', siteName, siteDescription, defaultTheme, allowDayMode, accentColor: accentColor || null,
            locale, timezone, socialLinks, contactDetails,
        },
        update: {
            siteName, siteDescription, defaultTheme, allowDayMode, accentColor: accentColor || null,
            locale, timezone, socialLinks, contactDetails,
        },
    });

    revalidatePath('/');
    revalidatePath('/contact');
    revalidatePath('/admin/settings');
}

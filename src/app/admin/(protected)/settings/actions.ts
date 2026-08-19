'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function field(form: FormData, key: string, max = 500) {
    const value = String(form.get(key) ?? '').trim();
    if (value.length > max) throw new Error(`${key} is too long.`);
    return value;
}

function urlOrEmpty(value: string) {
    if (!value) return '';
    if (value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Invalid URL.');
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Only HTTP/HTTPS URLs without embedded credentials are allowed.');
    }
    return parsed.toString();
}

function validTimezone(value: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
        return true;
    } catch {
        return false;
    }
}

export async function updateGeneralSettings(form: FormData) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

    const siteName = field(form, 'siteName', 120);
    const siteDescription = field(form, 'siteDescription', 500);
    const defaultTheme = field(form, 'defaultTheme', 16) === 'light' ? 'light' : 'dark';
    const allowDayMode = form.has('allowDayMode');
    const locale = field(form, 'locale', 20) || 'en';
    const timezone = field(form, 'timezone', 80) || 'Europe/Sofia';
    const accentColor = field(form, 'accentColor', 16);

    if (!siteName) throw new Error('Site name is required.');
    if (!/^[a-zA-Z]{2,3}(?:[-_][a-zA-Z]{2,8})?$/.test(locale)) throw new Error('Locale is invalid.');
    if (!validTimezone(timezone)) throw new Error('Timezone is invalid.');
    if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) throw new Error('Accent color must be a 6-digit hex color.');

    const email = field(form, 'email', 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Contact email is invalid.');

    const socialLinks = {
        github: urlOrEmpty(field(form, 'github', 2048)),
        instagram: urlOrEmpty(field(form, 'instagram', 2048)),
        linkedin: urlOrEmpty(field(form, 'linkedin', 2048)),
        twitter: urlOrEmpty(field(form, 'twitter', 2048)),
        discord: urlOrEmpty(field(form, 'discord', 2048)),
        spotify: urlOrEmpty(field(form, 'spotify', 2048)),
    };

    const contactDetails = {
        email,
        phone: field(form, 'phone', 64),
        location: field(form, 'location', 160),
        website: urlOrEmpty(field(form, 'website', 2048)),
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

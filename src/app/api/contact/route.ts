import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { isPublicWriteBlocked } from '@/lib/public-write-guard';

export const runtime = 'nodejs';

const reasons = ['PROJECT', 'DEVELOPMENT', 'CREATIVE', 'COMMUNITY', 'OTHER'] as const;

const contactSchema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(200),
    reason: z.enum(reasons),
    subject: z.string().trim().min(3).max(120),
    message: z.string().trim().min(20).max(3000),
    privacyAccepted: z.literal(true),
    company: z.string().max(200).optional().default(''),
});

type RateEntry = { count: number; resetAt: number };
const globalForContact = globalThis as unknown as { contactRateLimit?: Map<string, RateEntry> };
const rateLimit = globalForContact.contactRateLimit ?? new Map<string, RateEntry>();
if (process.env.NODE_ENV !== 'production') globalForContact.contactRateLimit = rateLimit;

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getClientIp(request: Request) {
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
}

function isRateLimited(ip: string) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const current = rateLimit.get(ip);

    if (!current || current.resetAt <= now) {
        rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }

    current.count += 1;
    rateLimit.set(ip, current);
    return current.count > 5;
}

export async function POST(request: Request) {
    if (await isPublicWriteBlocked()) {
        return NextResponse.json(
            { error: 'This portfolio is in archive mode. Contact submissions are disabled.' },
            { status: 423, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many messages were submitted. Please try again later.' }, { status: 429 });
    }

    try {
        const parsed = contactSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Please check the form fields and try again.' }, { status: 400 });
        }

        const data = parsed.data;

        // Honeypot: bots commonly fill every field. Return a neutral success response without sending mail.
        if (data.company) {
            return NextResponse.json({ message: 'Message received.' }, { status: 200 });
        }

        let recipient = process.env.EMAIL_USER || '';
        try {
            const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
            recipient = normalizeGeneralSiteSettings(settings).contactDetails.email || recipient;
        } catch {
            // Fall back to EMAIL_USER when CMS storage is unavailable.
        }

        const emailUser = process.env.EMAIL_USER || '';
        const emailPassword = process.env.EMAIL_APP_PASSWORD || '';
        if (!recipient || !emailUser || !emailPassword) {
            console.error('Contact form email delivery is not configured.');
            return NextResponse.json({ error: 'Message delivery is temporarily unavailable.' }, { status: 503 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT || 465),
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
            auth: { user: emailUser, pass: emailPassword },
        });

        const safeName = escapeHtml(data.name);
        const safeEmail = escapeHtml(data.email);
        const safeSubject = escapeHtml(data.subject);
        const safeReason = escapeHtml(data.reason.replaceAll('_', ' '));
        const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br />');

        await transporter.sendMail({
            from: `Portfolio Contact <${emailUser}>`,
            to: recipient,
            replyTo: data.email,
            subject: `[Portfolio/${data.reason}] ${data.subject}`,
            text: `Name: ${data.name}\nEmail: ${data.email}\nReason: ${data.reason}\n\n${data.message}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:16px">
                    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280;margin:0 0 16px">Portfolio contact</p>
                    <h2 style="margin:0 0 24px;color:#111827">${safeSubject}</h2>
                    <p><strong>Name:</strong> ${safeName}</p>
                    <p><strong>Email:</strong> ${safeEmail}</p>
                    <p><strong>Reason:</strong> ${safeReason}</p>
                    <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />
                    <div style="line-height:1.7;color:#374151">${safeMessage}</div>
                </div>
            `,
        });

        return NextResponse.json({ message: 'Message sent successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Contact form delivery failed:', error);
        return NextResponse.json({ error: 'The message could not be sent. Please try again later.' }, { status: 500 });
    }
}

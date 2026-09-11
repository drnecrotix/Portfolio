'use server';

import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getRuntimeSmtpConfig } from '@/lib/integration-runtime';
import { serviceStatusUrl } from '@/modules/service-requests/status-access';
import { inspectWebsite } from '@/modules/website-inspector/inspect';
import { inspectEmailDomain } from '@/modules/web-health/email-domain';
import { crawlSite } from '@/modules/web-health/site-crawl';
import { inspectAccessibility } from '@/modules/web-health/accessibility';

const statuses = new Set(['NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED', 'REJECTED']);

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Prisma.JsonObject) } : {};
}

function serializable(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function normalizeTarget(value: FormDataEntryValue | null) {
    if (value === null) return undefined;
    const target = String(value).trim();
    if (target.length < 3 || target.length > 2048 || /[\u0000-\u001f\u007f]/.test(target)) throw new Error('Enter a valid target or live website URL.');
    return target;
}

export async function updateServiceRequest(id: string, formData: FormData) {
    await requireAdmin();
    const status = String(formData.get('status') ?? 'NEW').trim();
    if (!statuses.has(status)) throw new Error('Invalid service request status.');
    const quote = Number(formData.get('finalQuote') ?? 0);
    const internalNotes = String(formData.get('internalNotes') ?? '').trim().slice(0, 5000);
    const target = normalizeTarget(formData.get('target'));

    await prisma.serviceRequest.update({
        where: { id },
        data: {
            status: status as 'NEW' | 'REVIEWING' | 'QUOTE_SENT' | 'ACCEPTED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'COMPLETED' | 'REJECTED',
            finalQuoteCents: Number.isFinite(quote) && quote > 0 && quote <= 50_000 ? Math.round(quote * 100) : null,
            internalNotes: internalNotes || null,
            ...(target !== undefined ? { target } : {}),
        },
    });
    revalidatePath('/admin/service-requests');
}

export async function sendServiceQuote(id: string, formData: FormData) {
    await requireAdmin();
    const quote = Number(formData.get('finalQuote') ?? 0);
    if (!Number.isFinite(quote) || quote <= 0 || quote > 50_000) throw new Error('Enter a valid final quote.');
    const note = String(formData.get('quoteNote') ?? '').trim().slice(0, 1500);
    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Service request not found.');

    const smtp = await getRuntimeSmtpConfig();
    if (!smtp.user || !smtp.password) throw new Error('SMTP is not configured.');
    const statusUrl = serviceStatusUrl(request.reference, request.customerEmail);
    const amount = new Intl.NumberFormat('en', { style: 'currency', currency: request.currency, maximumFractionDigits: 0 }).format(quote);
    const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.password } });

    await transporter.sendMail({
        from: `Kreatrics Customer Service <${smtp.user}>`,
        to: request.customerEmail,
        subject: `${request.reference} - final quote ${amount}`,
        text: `Hello ${request.customerName},\n\nYour service request ${request.reference} has been reviewed.\nFinal quote: ${amount}\n${note ? `\nNote: ${note}\n` : ''}\nOpen the private status page to review and accept the quote:\n${statusUrl}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">Kreatrics customer service</p><h2>Final quote: ${escapeHtml(amount)}</h2><p>Hello ${escapeHtml(request.customerName)},</p><p>Your request <strong>${escapeHtml(request.reference)}</strong> has been reviewed.</p>${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br />')}</p>` : ''}<p><a href="${escapeHtml(statusUrl)}">Review and accept the quote</a></p><p style="color:#64748b;font-size:12px">This is a private status link. Do not share it publicly.</p></div>`,
    });

    await prisma.serviceRequest.update({
        where: { id },
        data: { finalQuoteCents: Math.round(quote * 100), status: 'QUOTE_SENT' },
    });
    revalidatePath('/admin/service-requests');
}

async function runAfterAudit(source: string, target: string) {
    if (source === 'WEBSITE_INSPECTOR') return inspectWebsite(target);
    if (source === 'EMAIL_DOMAIN_SECURITY') return inspectEmailDomain(target);
    if (source === 'SITE_CRAWL') return crawlSite(target);
    if (source === 'ACCESSIBILITY_CHECK') return inspectAccessibility(target);
    throw new Error('This service request does not use before/after audit verification.');
}

export async function captureAfterAudit(id: string) {
    await requireAdmin();
    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Service request not found.');

    const report = await runAfterAudit(request.source, request.target);
    const current = jsonObject(request.auditSnapshot);
    const before = current.before ?? request.auditSnapshot ?? null;
    const next = {
        ...current,
        before,
        after: serializable(report),
        afterCheckedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue;

    await prisma.serviceRequest.update({ where: { id }, data: { auditSnapshot: next } });
    revalidatePath('/admin/service-requests');
}

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRuntimeSmtpConfig } from '@/lib/integration-runtime';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { isPublicWriteBlocked } from '@/lib/public-write-guard';
import { estimateServiceRange } from '@/modules/service-requests/estimate';
import { hasValidOrigin, isRateLimited, noStoreHeaders } from '@/modules/web-health/route-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sourceSchema = z.enum(['WEBSITE_INSPECTOR', 'EMAIL_DOMAIN_SECURITY', 'SITE_CRAWL', 'ACCESSIBILITY_CHECK']);
const issueSchema = z.object({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(160),
    status: z.enum(['warning', 'fail']),
    summary: z.string().trim().min(1).max(600),
    recommendation: z.string().trim().max(800).optional(),
});
const schema = z.object({
    source: sourceSchema,
    target: z.string().trim().min(3).max(2048),
    score: z.number().int().min(0).max(100).optional(),
    issues: z.array(issueSchema).max(40),
    snapshot: z.unknown().optional(),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(200),
    company: z.string().trim().max(120).optional().default(''),
    cms: z.string().trim().max(80).optional().default('Unknown'),
    accessStatus: z.string().trim().max(120).optional().default('Need guidance'),
    budget: z.union([z.string(), z.number(), z.null()]).optional(),
    message: z.string().trim().max(1500).optional().default(''),
    privacyAccepted: z.literal(true),
    website: z.string().max(200).optional().default(''),
    startedAt: z.number().int().positive(),
});

function escapeHtml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function reference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `KT-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function safeSnapshot(value: unknown): Prisma.InputJsonValue | undefined {
    if (!value || typeof value !== 'object') return undefined;
    try {
        const serialized = JSON.stringify(value);
        if (serialized.length > 20_000) return undefined;
        return JSON.parse(serialized) as Prisma.InputJsonValue;
    } catch {
        return undefined;
    }
}

async function notifyAdmin(request: { reference: string; name: string; email: string; source: string; target: string; estimateMin: number; estimateMax: number; issueCount: number }) {
    try {
        const smtp = await getRuntimeSmtpConfig();
        if (!smtp.user || !smtp.password) return;
        let recipient = smtp.user;
        try {
            const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
            const contact = normalizeGeneralSiteSettings(settings).contactDetails;
            recipient = contact.formRecipientEmail || contact.email || recipient;
        } catch {
            // Keep SMTP account as recipient when CMS settings are unavailable.
        }
        if (!recipient) return;

        const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.password } });
        await transporter.sendMail({
            from: `Kreatrics Service Requests <${smtp.user}>`,
            to: recipient,
            replyTo: request.email,
            subject: `[${request.reference}] ${request.source} - ${request.target}`,
            text: `Service request ${request.reference}\nCustomer: ${request.name} <${request.email}>\nSource: ${request.source}\nTarget: ${request.target}\nIssues: ${request.issueCount}\nEstimate: EUR ${request.estimateMin}-${request.estimateMax}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">Kreatrics service request</p><h2>${escapeHtml(request.reference)}</h2><p><strong>Customer:</strong> ${escapeHtml(request.name)} &lt;${escapeHtml(request.email)}&gt;</p><p><strong>Source:</strong> ${escapeHtml(request.source)}</p><p><strong>Target:</strong> ${escapeHtml(request.target)}</p><p><strong>Selected issues:</strong> ${request.issueCount}</p><p><strong>Automated estimate:</strong> EUR ${request.estimateMin}-${request.estimateMax}</p></div>`,
        });
    } catch (error) {
        console.error('[Service Requests] email notification failed', error);
    }
}

export async function POST(request: Request) {
    if (await isPublicWriteBlocked()) return NextResponse.json({ error: 'Service requests are disabled while the portfolio is in archive mode.' }, { status: 423, headers: noStoreHeaders });
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: noStoreHeaders });
    if (isRateLimited('service-request', request, 3, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many service requests were submitted. Try again later.' }, { status: 429, headers: noStoreHeaders });

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Check the service request fields and try again.' }, { status: 400, headers: noStoreHeaders });
    const data = parsed.data;
    const completionMs = Date.now() - data.startedAt;
    if (data.website || completionMs < 1500 || completionMs > 2 * 60 * 60 * 1000) return NextResponse.json({ reference: 'REQUEST-RECEIVED' }, { headers: noStoreHeaders });

    const estimate = estimateServiceRange(data.source, data.issues);
    const budgetNumber = Number(data.budget ?? 0);
    const budgetCents = Number.isFinite(budgetNumber) && budgetNumber > 0 ? Math.min(1_000_000, Math.round(budgetNumber * 100)) : undefined;
    const requestReference = reference();
    const snapshot = safeSnapshot(data.snapshot);

    const created = await prisma.serviceRequest.create({
        data: {
            reference: requestReference,
            source: data.source,
            target: data.target,
            customerName: data.name,
            customerEmail: data.email,
            company: data.company || undefined,
            cms: data.cms || undefined,
            accessStatus: data.accessStatus || undefined,
            budgetCents,
            selectedIssues: data.issues as Prisma.InputJsonValue,
            ...(snapshot ? { auditSnapshot: snapshot } : {}),
            scanScore: data.score,
            estimateMinCents: estimate.min * 100,
            estimateMaxCents: estimate.max * 100,
            currency: estimate.currency,
            customerMessage: data.message || undefined,
        },
        select: { reference: true },
    });

    await notifyAdmin({ reference: created.reference, name: data.name, email: data.email, source: data.source, target: data.target, estimateMin: estimate.min, estimateMax: estimate.max, issueCount: data.issues.length });
    return NextResponse.json({ reference: created.reference, estimate: { min: estimate.min, max: estimate.max, currency: estimate.currency } }, { status: 201, headers: noStoreHeaders });
}

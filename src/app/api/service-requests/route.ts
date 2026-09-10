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
import { serviceStatusUrl } from '@/modules/service-requests/status-access';
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

type NotificationIssue = z.infer<typeof issueSchema>;

type ServiceNotification = {
    reference: string;
    name: string;
    email: string;
    company: string;
    source: z.infer<typeof sourceSchema>;
    target: string;
    cms: string;
    accessStatus: string;
    budget?: number;
    message: string;
    estimateMin: number;
    estimateMax: number;
    issues: NotificationIssue[];
    statusUrl: string;
};

const sourceLabels: Record<z.infer<typeof sourceSchema>, string> = {
    WEBSITE_INSPECTOR: 'Website Inspector remediation',
    EMAIL_DOMAIN_SECURITY: 'Email Domain Security remediation',
    SITE_CRAWL: 'Site Crawl remediation',
    ACCESSIBILITY_CHECK: 'Accessibility remediation',
};

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

async function mailContext() {
    const smtp = await getRuntimeSmtpConfig();
    if (!smtp.user || !smtp.password) return null;
    let recipient = smtp.user;
    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        const contact = normalizeGeneralSiteSettings(settings).contactDetails;
        recipient = contact.formRecipientEmail || contact.email || recipient;
    } catch {
        // Keep SMTP account as recipient when CMS settings are unavailable.
    }
    const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.password } });
    return { smtp, recipient, transporter };
}

function issueText(issues: NotificationIssue[]) {
    if (!issues.length) return 'No automated warning or failure was selected.';
    return issues.map((issue) => `- ${issue.status.toUpperCase()}: ${issue.label} - ${issue.summary}`).join('\n');
}

function issueHtml(issues: NotificationIssue[]) {
    if (!issues.length) return '<p style="color:#64748b">No automated warning or failure was selected.</p>';
    return `<ul style="padding-left:20px">${issues.map((issue) => `<li style="margin:8px 0"><strong>${escapeHtml(issue.status.toUpperCase())}: ${escapeHtml(issue.label)}</strong><br><span style="color:#64748b">${escapeHtml(issue.summary)}</span></li>`).join('')}</ul>`;
}

async function notifyParties(request: ServiceNotification) {
    const context = await mailContext().catch((error) => {
        console.error('[Service Requests] SMTP context failed', error);
        return null;
    });
    if (!context) return { customerSent: false, adminSent: false };

    const { smtp, recipient, transporter } = context;
    const serviceInfoUrl = new URL('/services/pricing', request.statusUrl).toString();
    const serviceLabel = sourceLabels[request.source];
    const budgetText = request.budget ? `\nBudget: EUR ${request.budget}` : '';
    const companyText = request.company ? `\nCompany / project: ${request.company}` : '';
    const notesText = request.message ? `\nNotes: ${request.message}` : '';
    const budgetHtml = request.budget ? `<p><strong>Budget:</strong> EUR ${request.budget}</p>` : '';
    const companyHtml = request.company ? `<p><strong>Company / project:</strong> ${escapeHtml(request.company)}</p>` : '';
    const notesHtml = request.message ? `<p><strong>Notes:</strong> ${escapeHtml(request.message)}</p>` : '';

    const adminMail = recipient
        ? transporter.sendMail({
            from: `Kreatrics Service Requests <${smtp.user}>`,
            to: recipient,
            replyTo: request.email,
            subject: `[${request.reference}] ${request.source} - ${request.target}`,
            text: `Service request ${request.reference}\nCustomer: ${request.name} <${request.email}>${companyText}\nSource: ${serviceLabel}\nTarget: ${request.target}\nCMS / technology: ${request.cms}\nAccess: ${request.accessStatus}\nSelected issues: ${request.issues.length}${budgetText}${notesText}\nEstimate: EUR ${request.estimateMin}-${request.estimateMax}\n\nSelected findings:\n${issueText(request.issues)}\n\nStatus: ${request.statusUrl}\nService information: ${serviceInfoUrl}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">Kreatrics service request</p><h2>${escapeHtml(request.reference)}</h2><p><strong>Customer:</strong> ${escapeHtml(request.name)} &lt;${escapeHtml(request.email)}&gt;</p>${companyHtml}<p><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p><p><strong>Target:</strong> ${escapeHtml(request.target)}</p><p><strong>CMS / technology:</strong> ${escapeHtml(request.cms)}</p><p><strong>Access:</strong> ${escapeHtml(request.accessStatus)}</p><p><strong>Selected issues:</strong> ${request.issues.length}</p>${budgetHtml}${notesHtml}<p><strong>Automated estimate:</strong> EUR ${request.estimateMin}-${request.estimateMax}</p><h3 style="margin-top:24px">Selected findings</h3>${issueHtml(request.issues)}<p><a href="${escapeHtml(request.statusUrl)}">Open customer status page</a></p><p><a href="${escapeHtml(serviceInfoUrl)}">Open service information and pricing</a></p></div>`,
        })
        : Promise.resolve();

    const customerMail = transporter.sendMail({
        from: `Kreatrics Customer Service <${smtp.user}>`,
        to: request.email,
        replyTo: recipient || smtp.user,
        subject: `${request.reference} - your service request was received`,
        text: `Hello ${request.name},\n\nThank you for your service request. We received it successfully and will review the audit before confirming the final scope and quote.\n\nRequest reference: ${request.reference}\nService: ${serviceLabel}\nTarget: ${request.target}\nCMS / technology: ${request.cms}\nAccess: ${request.accessStatus}\nSelected issues: ${request.issues.length}${budgetText}${companyText}${notesText}\nAutomated estimate: EUR ${request.estimateMin}-${request.estimateMax}\n\nSelected findings:\n${issueText(request.issues)}\n\nPrivate request status: ${request.statusUrl}\nService information and pricing: ${serviceInfoUrl}\n\nKeep the private status link because it provides access to your request status.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#0f172a"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">Kreatrics customer service</p><h2 style="margin-bottom:8px">Service request received</h2><p>Hello ${escapeHtml(request.name)},</p><p>Thank you for your request. We received it successfully and will review the audit before confirming the final scope and quote.</p><div style="margin:24px 0;padding:18px;border:1px solid #e2e8f0"><p style="margin:0 0 8px"><strong>Reference:</strong> ${escapeHtml(request.reference)}</p><p style="margin:8px 0"><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p><p style="margin:8px 0"><strong>Target:</strong> ${escapeHtml(request.target)}</p><p style="margin:8px 0"><strong>CMS / technology:</strong> ${escapeHtml(request.cms)}</p><p style="margin:8px 0"><strong>Access:</strong> ${escapeHtml(request.accessStatus)}</p><p style="margin:8px 0"><strong>Selected issues:</strong> ${request.issues.length}</p>${companyHtml}${budgetHtml}${notesHtml}<p style="margin:8px 0"><strong>Automated estimate:</strong> EUR ${request.estimateMin}-${request.estimateMax}</p></div><h3>Selected findings</h3>${issueHtml(request.issues)}<p style="margin-top:24px"><a href="${escapeHtml(request.statusUrl)}" style="display:inline-block;padding:12px 16px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700">Track your request</a></p><p><a href="${escapeHtml(serviceInfoUrl)}">Service information and EUR pricing</a></p><p style="color:#64748b;font-size:12px">Keep the private status link because it provides access to your request status.</p></div>`,
    });

    try {
        const [adminResult, customerResult] = await Promise.allSettled([adminMail, customerMail]);
        if (adminResult.status === 'rejected') console.error('[Service Requests] admin email notification failed', adminResult.reason);
        if (customerResult.status === 'rejected') console.error('[Service Requests] customer confirmation email failed', customerResult.reason);
        return { customerSent: customerResult.status === 'fulfilled', adminSent: adminResult.status === 'fulfilled' };
    } finally {
        transporter.close();
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

    const estimate = estimateServiceRange(data.source, data.issues, { cms: data.cms, accessStatus: data.accessStatus });
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
            ...(snapshot ? { auditSnapshot: { before: snapshot } as Prisma.InputJsonValue } : {}),
            scanScore: data.score,
            estimateMinCents: estimate.min * 100,
            estimateMaxCents: estimate.max * 100,
            currency: estimate.currency,
            customerMessage: data.message || undefined,
        },
        select: { reference: true, customerEmail: true },
    });

    const statusUrl = serviceStatusUrl(created.reference, created.customerEmail);
    const mail = await notifyParties({
        reference: created.reference,
        name: data.name,
        email: data.email,
        company: data.company,
        source: data.source,
        target: data.target,
        cms: data.cms,
        accessStatus: data.accessStatus,
        budget: budgetCents ? budgetCents / 100 : undefined,
        message: data.message,
        estimateMin: estimate.min,
        estimateMax: estimate.max,
        issues: data.issues,
        statusUrl,
    });

    return NextResponse.json({
        reference: created.reference,
        statusUrl,
        confirmationEmailSent: mail.customerSent,
        estimate: { min: estimate.min, max: estimate.max, currency: estimate.currency },
    }, { status: 201, headers: noStoreHeaders });
}

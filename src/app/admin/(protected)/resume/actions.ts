'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeResumeSettings, RESUME_CONFIG_SLUG, type ResumeSettings } from '@/lib/resume-settings';

export type ResumeSettingsSaveResult = {
    ok: boolean;
    message: string;
    savedAt?: string;
};

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function value(form: FormData, key: string, max: number) {
    return String(form.get(key) ?? '').trim().slice(0, max);
}

async function verifiedPdfUrl(raw: string, fallback: string) {
    const url = raw || fallback;
    if (url === '/resume.pdf') return url;
    const asset = await prisma.mediaAsset.findFirst({ where: { url }, select: { fileName: true, mimeType: true } });
    if (!asset) throw new Error('Choose a PDF that exists in Media Library.');
    if (asset.mimeType !== 'application/pdf' && !asset.fileName.toLowerCase().endsWith('.pdf')) {
        throw new Error(`${asset.fileName} is not a PDF file.`);
    }
    return url;
}

export async function saveResumeSettings(form: FormData): Promise<ResumeSettingsSaveResult> {
    try {
        await requireEditor();
        const previousPage = await prisma.page.findUnique({ where: { slug: RESUME_CONFIG_SLUG }, select: { content: true } }).catch(() => null);
        const previous = normalizeResumeSettings(previousPage?.content);
        const webViewPdfUrl = await verifiedPdfUrl(value(form, 'webViewPdfUrl', 2048), previous.webViewPdfUrl);
        const downloadPdfUrl = await verifiedPdfUrl(value(form, 'downloadPdfUrl', 2048), previous.downloadPdfUrl);

        const content: ResumeSettings = normalizeResumeSettings({
            enabled: form.get('enabled') === 'on',
            showDocumentCard: form.get('showDocumentCard') === 'on',
            webViewPdfUrl,
            downloadPdfUrl,
            webViewLabel: value(form, 'webViewLabel', 60),
            downloadLabel: value(form, 'downloadLabel', 60),
            downloadFileName: value(form, 'downloadFileName', 120),
            documentTitle: value(form, 'documentTitle', 120),
            documentDescription: value(form, 'documentDescription', 500),
        });

        const saved = await prisma.page.upsert({
            where: { slug: RESUME_CONFIG_SLUG },
            update: { title: 'Career Dossier settings', status: 'DRAFT', content },
            create: { slug: RESUME_CONFIG_SLUG, title: 'Career Dossier settings', status: 'DRAFT', content },
            select: { updatedAt: true },
        });

        revalidatePath('/admin/resume');
        revalidatePath('/resume');
        revalidatePath('/resume/view');
        revalidatePath('/api/resume/view');
        revalidatePath('/api/resume/download');
        return { ok: true, message: 'Career Dossier settings saved.', savedAt: saved.updatedAt.toISOString() };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Career Dossier settings could not be saved.' };
    }
}

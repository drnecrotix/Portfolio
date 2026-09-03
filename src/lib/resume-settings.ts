export const RESUME_CONFIG_SLUG = '__resume-config';

export type ResumeSettings = {
    enabled: boolean;
    showDocumentCard: boolean;
    webViewPdfUrl: string;
    downloadPdfUrl: string;
    webViewLabel: string;
    downloadLabel: string;
    downloadFileName: string;
    documentTitle: string;
    documentDescription: string;
};

export const defaultResumeSettings: ResumeSettings = {
    enabled: true,
    showDocumentCard: true,
    webViewPdfUrl: '/resume.pdf',
    downloadPdfUrl: '/resume.pdf',
    webViewLabel: 'Web View',
    downloadLabel: 'Download CV',
    downloadFileName: 'Nikola-Stoyanov-CV.pdf',
    documentTitle: 'Formal CV',
    documentDescription: 'A compact PDF companion for applications, offline review and traditional CV workflows.',
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, max: number) {
    const normalized = String(value ?? '').trim();
    return (normalized || fallback).slice(0, max);
}

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function pdfUrl(value: unknown, fallback: string) {
    const url = String(value ?? '').trim().slice(0, 2048);
    if (!url) return fallback;
    if (url === '/resume.pdf') return url;
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : fallback;
    } catch {
        return fallback;
    }
}

function pdfFileName(value: unknown, fallback: string) {
    const raw = String(value ?? '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
    if (!raw) return fallback;
    return raw.toLowerCase().endsWith('.pdf') ? raw : `${raw}.pdf`;
}

export function normalizeResumeSettings(value: unknown): ResumeSettings {
    const source = record(value);
    return {
        enabled: bool(source.enabled, defaultResumeSettings.enabled),
        showDocumentCard: bool(source.showDocumentCard, defaultResumeSettings.showDocumentCard),
        webViewPdfUrl: pdfUrl(source.webViewPdfUrl, defaultResumeSettings.webViewPdfUrl),
        downloadPdfUrl: pdfUrl(source.downloadPdfUrl, defaultResumeSettings.downloadPdfUrl),
        webViewLabel: text(source.webViewLabel, defaultResumeSettings.webViewLabel, 60),
        downloadLabel: text(source.downloadLabel, defaultResumeSettings.downloadLabel, 60),
        downloadFileName: pdfFileName(source.downloadFileName, defaultResumeSettings.downloadFileName),
        documentTitle: text(source.documentTitle, defaultResumeSettings.documentTitle, 120),
        documentDescription: text(source.documentDescription, defaultResumeSettings.documentDescription, 500),
    };
}

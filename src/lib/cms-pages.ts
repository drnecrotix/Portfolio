import { safeCmsMediaUrl, sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

export type CmsPageContent = { html: string; featuredImage?: string };

export function pageContentToHtml(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'html' in value) {
        return sanitizeCmsHtml((value as CmsPageContent).html ?? '');
    }
    return '';
}

export function pageFeaturedImage(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'featuredImage' in value) {
        return safeCmsMediaUrl((value as CmsPageContent).featuredImage ?? '');
    }
    return '';
}

export function formToPageContent(value: FormDataEntryValue | null, featuredImage?: FormDataEntryValue | null): CmsPageContent {
    const image = safeCmsMediaUrl(featuredImage);
    return { html: sanitizeCmsHtml(value), ...(image ? { featuredImage: image } : {}) };
}

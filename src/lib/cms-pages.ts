export type CmsPageContent = { html: string };

export function pageContentToHtml(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'html' in value) {
        return String((value as CmsPageContent).html ?? '');
    }
    return '';
}

export function formToPageContent(value: FormDataEntryValue | null): CmsPageContent {
    return { html: String(value ?? '') };
}

import 'server-only';

import { normalizePublicUrl, requestPublicPage } from './http';
import { scoreHealthChecks } from './scoring';
import type { AccessibilityReport, HealthCheck } from './types';

function attr(tag: string, name: string) {
    const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    if (quoted?.[2] !== undefined) return quoted[2].trim();
    const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'));
    return bare?.[1]?.trim();
}

function textContent(html: string) {
    return html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasName(tag: string, innerText = '') {
    return Boolean(attr(tag, 'aria-label') || attr(tag, 'aria-labelledby') || attr(tag, 'title') || textContent(innerText));
}

export async function inspectAccessibility(input: string): Promise<AccessibilityReport> {
    const requested = normalizePublicUrl(input);
    const raw = await requestPublicPage(requested, { maxBodyBytes: 512 * 1024, timeoutMs: 7_000, maxRedirects: 3 });
    const contentType = String(raw.headers['content-type'] ?? '');
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('Accessibility Check requires an HTML page.');

    const html = raw.body;
    const checks: HealthCheck[] = [];
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
    const language = attr(htmlTag, 'lang');
    checks.push({
        id: 'lang', label: 'Document language', status: language ? 'pass' : 'fail',
        summary: language ? `The document declares lang="${language}".` : 'The <html> element does not declare a language.',
        recommendation: language ? undefined : 'Add a valid lang attribute to the root <html> element so assistive technology can select the correct language rules.',
    });

    const title = textContent(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    checks.push({ id: 'title', label: 'Document title', status: title ? 'pass' : 'fail', summary: title ? 'A non-empty page title is present.' : 'No usable <title> text was detected.', recommendation: title ? undefined : 'Give each page a concise, descriptive <title>.' });

    const viewport = (html.match(/<meta\b[^>]*>/gi) ?? []).some((tag) => (attr(tag, 'name') ?? '').toLowerCase() === 'viewport');
    checks.push({ id: 'viewport', label: 'Mobile viewport', status: viewport ? 'pass' : 'warning', summary: viewport ? 'A viewport meta tag is present.' : 'No viewport meta tag was detected.', recommendation: viewport ? undefined : 'Add a standard responsive viewport declaration for mobile users.' });

    const images = html.match(/<img\b[^>]*>/gi) ?? [];
    const missingAlt = images.filter((tag) => !/\balt\s*=/i.test(tag)).length;
    checks.push({
        id: 'image-alt', label: 'Image alternatives', status: missingAlt === 0 ? 'pass' : 'warning',
        summary: images.length ? `${images.length} image${images.length === 1 ? '' : 's'} found; ${missingAlt} missing an alt attribute.` : 'No <img> elements were found.',
        recommendation: missingAlt ? 'Add meaningful alt text for informative images and alt="" for decorative images.' : undefined,
    });

    const labelFor = new Set((html.match(/<label\b[^>]*>/gi) ?? []).map((tag) => attr(tag, 'for')).filter((value): value is string => Boolean(value)));
    const controls = [
        ...(html.match(/<input\b[^>]*>/gi) ?? []).filter((tag) => (attr(tag, 'type') ?? '').toLowerCase() !== 'hidden'),
        ...(html.match(/<select\b[^>]*>/gi) ?? []),
        ...(html.match(/<textarea\b[^>]*>/gi) ?? []),
    ];
    const unlabeledControls = controls.filter((tag) => {
        if (attr(tag, 'aria-label') || attr(tag, 'aria-labelledby') || attr(tag, 'title')) return false;
        const id = attr(tag, 'id');
        return !id || !labelFor.has(id);
    }).length;
    checks.push({
        id: 'form-labels', label: 'Form control labels', status: unlabeledControls === 0 ? 'pass' : 'warning',
        summary: controls.length ? `${controls.length} form control${controls.length === 1 ? '' : 's'} found; ${unlabeledControls} lack an obvious label signal.` : 'No standard form controls were found.',
        recommendation: unlabeledControls ? 'Associate controls with <label for>, aria-label or aria-labelledby. Wrapped-label patterns may require manual review.' : undefined,
    });

    const buttons = [...html.matchAll(/(<button\b[^>]*>)([\s\S]*?)<\/button>/gi)];
    const unnamedButtons = buttons.filter((match) => !hasName(match[1], match[2])).length;
    checks.push({ id: 'button-names', label: 'Button names', status: unnamedButtons === 0 ? 'pass' : 'warning', summary: `${buttons.length} button${buttons.length === 1 ? '' : 's'} found; ${unnamedButtons} lack an obvious accessible name.`, recommendation: unnamedButtons ? 'Give icon-only or empty buttons an accessible name with visible text or ARIA naming.' : undefined });

    const anchors = [...html.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/gi)];
    const unnamedLinks = anchors.filter((match) => !hasName(match[1], match[2]) && !/<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(match[2])).length;
    checks.push({ id: 'link-names', label: 'Link names', status: unnamedLinks === 0 ? 'pass' : 'warning', summary: `${anchors.length} link${anchors.length === 1 ? '' : 's'} found; ${unnamedLinks} lack an obvious text or ARIA name.`, recommendation: unnamedLinks ? 'Ensure every functional link exposes a meaningful accessible name.' : undefined });

    const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) => Number(match[1]));
    let headingJumps = 0;
    for (let index = 1; index < headings.length; index += 1) if (headings[index] > headings[index - 1] + 1) headingJumps += 1;
    const h1Count = headings.filter((level) => level === 1).length;
    checks.push({
        id: 'headings', label: 'Heading structure', status: h1Count === 1 && headingJumps === 0 ? 'pass' : 'warning',
        summary: `${headings.length} headings detected; ${h1Count} H1; ${headingJumps} level jump${headingJumps === 1 ? '' : 's'}.`,
        recommendation: h1Count === 1 && headingJumps === 0 ? undefined : 'Use headings to express document structure and avoid skipping levels where possible.',
    });

    const ids = (html.match(/\bid\s*=\s*["'][^"']+["']/gi) ?? []).map((item) => item.replace(/^.*?["']|["']$/g, '').toLowerCase());
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index).filter((id, index, all) => all.indexOf(id) === index).length;
    checks.push({ id: 'duplicate-ids', label: 'Duplicate IDs', status: duplicateIds === 0 ? 'pass' : 'warning', summary: duplicateIds ? `${duplicateIds} duplicated id value${duplicateIds === 1 ? '' : 's'} detected.` : 'No duplicated id values were detected in the captured HTML.', recommendation: duplicateIds ? 'Make id attributes unique so labels, fragments and ARIA references resolve predictably.' : undefined });

    const mainLandmark = /<main\b/i.test(html) || /\brole\s*=\s*["']main["']/i.test(html);
    checks.push({ id: 'main-landmark', label: 'Main landmark', status: mainLandmark ? 'pass' : 'warning', summary: mainLandmark ? 'A main content landmark was detected.' : 'No <main> or role="main" landmark was detected.', recommendation: mainLandmark ? undefined : 'Mark the primary page content with a main landmark.' });

    const skipLink = anchors.some((match) => /^#/.test(attr(match[1], 'href') ?? '') && /skip/i.test(textContent(match[2])));
    checks.push({ id: 'skip-link', label: 'Skip navigation', status: skipLink ? 'pass' : 'info', summary: skipLink ? 'A likely skip-navigation link was detected.' : 'No obvious skip-navigation link was detected in static HTML.', recommendation: skipLink ? undefined : 'For navigation-heavy pages, consider a keyboard-visible skip link to the main content.' });
    checks.push({ id: 'manual-review', label: 'Manual accessibility review', status: 'info', summary: 'Static HTML checks cannot verify color contrast, focus order, keyboard behavior, dynamic ARIA updates or screen-reader usability.' });

    return {
        requestedUrl: requested.toString(),
        finalUrl: raw.finalUrl.toString(),
        checkedAt: new Date().toISOString(),
        statusCode: raw.statusCode,
        responseTimeMs: raw.responseTimeMs,
        score: scoreHealthChecks(checks),
        checks,
        stats: { images: images.length, missingAlt, controls: controls.length, unlabeledControls, headings: headings.length, duplicateIds },
    };
}

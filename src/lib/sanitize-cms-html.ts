import sanitizeHtml from 'sanitize-html';

const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'code', 'pre', 'hr', 'span',
];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
    a: ['href', 'target', 'rel'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    h5: ['style'],
    h6: ['style'],
    span: ['class'],
    code: ['class'],
};

export function sanitizeCmsHtml(value: unknown) {
    return sanitizeHtml(String(value ?? ''), {
        allowedTags,
        allowedAttributes,
        allowedStyles: {
            '*': {
                'text-align': [/^(left|center|right|justify)$/],
            },
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowProtocolRelative: false,
        disallowedTagsMode: 'discard',
        transformTags: {
            a: (_tagName, attribs) => {
                const external = attribs.target === '_blank';
                return {
                    tagName: 'a',
                    attribs: {
                        ...attribs,
                        ...(external ? { rel: 'noopener noreferrer' } : {}),
                    },
                };
            },
        },
    });
}

export function safeCmsMediaUrl(value: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    try {
        const parsed = new URL(raw);
        return parsed.protocol === 'https:' ? parsed.toString() : '';
    } catch {
        return '';
    }
}

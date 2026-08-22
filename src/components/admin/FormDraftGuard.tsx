'use client';

import { useEffect, useRef, useState } from 'react';

const CACHE_ENABLED_KEY = 'necrotix:editor-draft-cache-enabled';
const CACHE_PREFIX = 'necrotix:editor-draft:';
const MAX_DRAFT_AGE = 7 * 24 * 60 * 60 * 1000;

type CachedDraft = {
    savedAt: number;
    fields: Record<string, string[]>;
};

type DraftEventDetail = {
    key: string;
    fields?: Record<string, string[]>;
};

function cacheKey(key: string) {
    return `${CACHE_PREFIX}${key}`;
}

function serializeForm(form: HTMLFormElement) {
    const fields: Record<string, string[]> = {};
    const data = new FormData(form);
    for (const [name, value] of data.entries()) {
        if (value instanceof File) continue;
        (fields[name] ||= []).push(String(value));
    }
    return fields;
}

function fingerprint(form: HTMLFormElement) {
    return JSON.stringify(serializeForm(form));
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        element.checked = value === element.value || value === 'on' || value === 'true';
    } else {
        const proto = element instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : element instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLSelectElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(element, value);
        else element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function restoreFields(form: HTMLFormElement, fields: Record<string, string[]>) {
    for (const [name, values] of Object.entries(fields)) {
        const elements = Array.from(form.elements).filter((item): item is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
            (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement) && item.name === name,
        );
        if (!elements.length) continue;

        elements.forEach((element, index) => {
            if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
                element.checked = values.includes(element.value) || values.includes('on');
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            setNativeValue(element, values[Math.min(index, values.length - 1)] ?? '');
        });
    }

    window.dispatchEvent(new CustomEvent<DraftEventDetail>('necrotix:draft-restore', { detail: { key: '', fields } }));
}

export function markDraftCommitted(key: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<DraftEventDetail>('necrotix:draft-committed', { detail: { key } }));
}

export function FormDraftGuard({ draftKey, label = 'editor' }: { draftKey: string; label?: string }) {
    const anchorRef = useRef<HTMLDivElement>(null);
    const baselineRef = useRef('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [dirty, setDirty] = useState(false);
    const [cacheEnabled, setCacheEnabled] = useState(true);
    const [cachedDraft, setCachedDraft] = useState<CachedDraft | null>(null);
    const [lastCachedAt, setLastCachedAt] = useState<number | null>(null);

    useEffect(() => {
        const form = anchorRef.current?.closest('form');
        if (!(form instanceof HTMLFormElement)) return;

        const enabled = localStorage.getItem(CACHE_ENABLED_KEY) !== '0';
        setCacheEnabled(enabled);
        baselineRef.current = fingerprint(form);

        try {
            const raw = localStorage.getItem(cacheKey(draftKey));
            if (raw) {
                const parsed = JSON.parse(raw) as CachedDraft;
                if (parsed?.savedAt && parsed.fields && Date.now() - parsed.savedAt <= MAX_DRAFT_AGE) {
                    setCachedDraft(parsed);
                    setLastCachedAt(parsed.savedAt);
                } else {
                    localStorage.removeItem(cacheKey(draftKey));
                }
            }
        } catch {
            localStorage.removeItem(cacheKey(draftKey));
        }

        const saveDraft = () => {
            if (localStorage.getItem(CACHE_ENABLED_KEY) === '0') return;
            const payload: CachedDraft = { savedAt: Date.now(), fields: serializeForm(form) };
            try {
                localStorage.setItem(cacheKey(draftKey), JSON.stringify(payload));
                setLastCachedAt(payload.savedAt);
            } catch {
                // Storage may be unavailable or full. Leave protection still remains active.
            }
        };

        const onChange = () => {
            const changed = fingerprint(form) !== baselineRef.current;
            setDirty(changed);
            if (!changed) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(saveDraft, 650);
        };

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (fingerprint(form) === baselineRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        const onCommitted = (event: Event) => {
            const detail = (event as CustomEvent<DraftEventDetail>).detail;
            if (detail?.key !== draftKey) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            localStorage.removeItem(cacheKey(draftKey));
            baselineRef.current = fingerprint(form);
            setDirty(false);
            setCachedDraft(null);
            setLastCachedAt(null);
        };

        form.addEventListener('input', onChange);
        form.addEventListener('change', onChange);
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('necrotix:draft-committed', onCommitted);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            form.removeEventListener('input', onChange);
            form.removeEventListener('change', onChange);
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('necrotix:draft-committed', onCommitted);
        };
    }, [draftKey]);

    const restore = () => {
        const form = anchorRef.current?.closest('form');
        if (!(form instanceof HTMLFormElement) || !cachedDraft) return;
        restoreFields(form, cachedDraft.fields);
        setDirty(true);
        setCachedDraft(null);
    };

    const discard = () => {
        localStorage.removeItem(cacheKey(draftKey));
        setCachedDraft(null);
        setLastCachedAt(null);
    };

    const toggleCache = () => {
        const next = !cacheEnabled;
        setCacheEnabled(next);
        localStorage.setItem(CACHE_ENABLED_KEY, next ? '1' : '0');
        if (!next) discard();
    };

    return (
        <div ref={anchorRef} className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs">
            {cachedDraft ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-medium text-amber-200">Unsaved {label} draft found</p>
                        <p className="mt-1 text-white/40">A local recovery copy from {new Date(cachedDraft.savedAt).toLocaleString()} is available.</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={discard} className="rounded-lg border border-white/10 px-3 py-2 text-white/50 hover:text-white">Discard</button>
                        <button type="button" onClick={restore} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold text-black">Restore draft</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className={dirty ? 'font-medium text-amber-200' : 'font-medium text-white/65'}>{dirty ? 'Unsaved changes protected locally' : 'Local recovery protection active'}</p>
                        <p className="mt-1 text-white/35">
                            {cacheEnabled ? `Changes are cached in this browser${lastCachedAt ? ` - last copy ${new Date(lastCachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}.` : 'Local draft cache is disabled.'}
                            {' '}You will be warned before refreshing or closing with unsaved changes.
                        </p>
                    </div>
                    <button type="button" onClick={toggleCache} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-white/55 hover:text-white">{cacheEnabled ? 'Disable local cache' : 'Enable local cache'}</button>
                </div>
            )}
        </div>
    );
}

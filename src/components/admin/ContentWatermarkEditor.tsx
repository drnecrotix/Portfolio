'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Save } from 'lucide-react';
import type { ContentWatermarkPosition, ContentWatermarkSettings, ContentWatermarkSize } from '@/lib/content-watermark';
import { saveContentWatermark } from '@/app/admin/(protected)/watermark/actions';

const field = 'w-full rounded-xl border border-foreground/10 bg-foreground/[0.025] px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-sky-400/40 focus:bg-foreground/[0.04]';

export function ContentWatermarkEditor({ initial, updatedAt }: { initial: ContentWatermarkSettings; updatedAt?: string | null }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [enabled, setEnabled] = useState(initial.enabled);
    const [text, setText] = useState(initial.text);
    const [opacity, setOpacity] = useState(initial.opacity);
    const [position, setPosition] = useState<ContentWatermarkPosition>(initial.position);
    const [size, setSize] = useState<ContentWatermarkSize>(initial.size);
    const [status, setStatus] = useState<{ ok: boolean; message: string; savedAt?: string } | null>(null);

    const submit = () => {
        const form = new FormData();
        if (enabled) form.set('enabled', 'on');
        form.set('text', text);
        form.set('opacity', String(opacity));
        form.set('position', position);
        form.set('size', size);

        startTransition(async () => {
            const result = await saveContentWatermark(form);
            setStatus(result);
            if (result.ok) router.refresh();
        });
    };

    const previewPosition = position === 'top-left'
        ? 'left-3 top-3'
        : position === 'top-right'
            ? 'right-3 top-3'
            : position === 'bottom-left'
                ? 'bottom-3 left-3'
                : 'bottom-3 right-3';

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 pb-4">
                    <div>
                        <h3 className="text-base font-semibold">Global Blog + Projects watermark</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">One shared watermark for public Blog article images and Project images. Individual posts and projects do not get their own setting.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-sky-500" />
                        Enabled
                    </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                        <span className="text-xs font-semibold text-muted-foreground">Watermark text</span>
                        <input value={text} onChange={(event) => setText(event.target.value)} maxLength={120} className={`mt-1.5 ${field}`} placeholder="NecrotixLab" />
                        <span className="mt-1.5 block text-[11px] text-muted-foreground">The copyright symbol is added automatically.</span>
                    </label>

                    <label>
                        <span className="text-xs font-semibold text-muted-foreground">Position</span>
                        <select value={position} onChange={(event) => setPosition(event.target.value as ContentWatermarkPosition)} className={`mt-1.5 ${field}`}>
                            <option value="bottom-right">Bottom right</option>
                            <option value="bottom-left">Bottom left</option>
                            <option value="top-right">Top right</option>
                            <option value="top-left">Top left</option>
                        </select>
                    </label>

                    <label>
                        <span className="text-xs font-semibold text-muted-foreground">Size</span>
                        <select value={size} onChange={(event) => setSize(event.target.value as ContentWatermarkSize)} className={`mt-1.5 ${field}`}>
                            <option value="small">Small - Gallery-like</option>
                            <option value="medium">Medium</option>
                        </select>
                    </label>

                    <label className="sm:col-span-2">
                        <span className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground"><span>Opacity</span><span>{Math.round(opacity * 100)}%</span></span>
                        <input type="range" min="0.12" max="0.8" step="0.01" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="mt-2 w-full accent-sky-500" />
                    </label>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4">
                    <div className="text-[11px] text-muted-foreground">
                        {status ? <span className={status.ok ? 'text-emerald-500' : 'text-rose-500'}>{status.message}{status.savedAt ? ` · ${new Date(status.savedAt).toLocaleTimeString()}` : ''}</span> : updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : 'Using default watermark settings until first save.'}
                    </div>
                    <button type="button" onClick={submit} disabled={pending || !text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                        {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" /> : status?.ok ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                        {pending ? 'Saving...' : 'Save watermark'}
                    </button>
                </div>
            </section>

            <aside className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 sm:p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
                <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-foreground/10 bg-[radial-gradient(circle_at_30%_30%,rgba(14,165,233,0.2),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))]">
                    <div className="absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">Image preview</div>
                    {enabled && text.trim() ? <span className={`pointer-events-none absolute ${previewPosition} max-w-[72%] truncate rounded-md bg-black/35 px-2 py-1 font-medium tracking-[0.08em] text-white backdrop-blur-[2px] ${size === 'medium' ? 'text-xs' : 'text-[10px]'}`} style={{ opacity }}>© {text.trim()}</span> : null}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">This is a visual overlay only. Original Media Library files, downloads and OpenGraph/social images remain untouched.</p>
            </aside>
        </div>
    );
}

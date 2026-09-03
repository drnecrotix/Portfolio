'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Copy, ExternalLink, FileText, Loader2, Save } from 'lucide-react';
import { saveResumeSettings } from '@/app/admin/(protected)/resume/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';
import { MediaPicker } from '@/components/admin/MediaPicker';
import type { ResumeSettings } from '@/lib/resume-settings';

const field = 'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400/40 focus:bg-white/[0.055]';
const draftKey = 'admin-resume-settings';

export function ResumeSettingsEditor({ initial, updatedAt }: { initial: ResumeSettings; updatedAt?: string | null }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [webViewPdfUrl, setWebViewPdfUrl] = useState(initial.webViewPdfUrl);
    const [downloadPdfUrl, setDownloadPdfUrl] = useState(initial.downloadPdfUrl);
    const [notice, setNotice] = useState<{ ok: boolean; message: string; savedAt?: string } | null>(null);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        startTransition(async () => {
            const result = await saveResumeSettings(new FormData(form));
            setNotice(result);
            if (result.ok) {
                markDraftCommitted(draftKey);
                router.refresh();
            }
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <FormDraftGuard draftKey={draftKey} label="Career Dossier settings" />
            {notice ? (
                <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${notice.ok ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200' : 'border-red-400/20 bg-red-400/[0.06] text-red-200'}`}>
                    {notice.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}
                    <div><p>{notice.message}</p>{notice.savedAt ? <p className="mt-1 text-[10px] opacity-60">Saved {new Date(notice.savedAt).toLocaleTimeString()}</p> : null}</div>
                </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-white/[0.018] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">Browser document</p><h3 className="mt-1 text-base font-semibold">Web View PDF</h3></div><FileText className="size-5 text-sky-300" /></div>
                    <MediaPicker value={webViewPdfUrl} onChange={setWebViewPdfUrl} inputName="webViewPdfUrl" label="PDF shown from Career Dossier" initialKind="file" lockKind />
                    <div className="mt-3 flex flex-wrap gap-2">
                        {webViewPdfUrl ? <a href={webViewPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white">Preview <ExternalLink className="size-3" /></a> : null}
                        <button type="button" onClick={() => setDownloadPdfUrl(webViewPdfUrl)} disabled={!webViewPdfUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white disabled:opacity-35"><Copy className="size-3" /> Use for download too</button>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.018] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">Application document</p><h3 className="mt-1 text-base font-semibold">Download CV PDF</h3></div><FileText className="size-5 text-emerald-300" /></div>
                    <MediaPicker value={downloadPdfUrl} onChange={setDownloadPdfUrl} inputName="downloadPdfUrl" label="PDF downloaded by visitors" initialKind="file" lockKind />
                    <p className="mt-3 text-[11px] leading-5 text-white/35">Download is served through the protected resume download endpoint so R2-hosted PDFs download correctly instead of opening in another tab.</p>
                </section>
            </div>

            <details className="rounded-2xl border border-white/10 bg-white/[0.018] p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white/75 [&::-webkit-details-marker]:hidden">Display & labels</summary>
                <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" name="enabled" defaultChecked={initial.enabled} /> Career Dossier enabled</label>
                    <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" name="showDocumentCard" defaultChecked={initial.showDocumentCard} /> Show document card</label>
                    <label className="text-xs text-white/45">Web View label<input name="webViewLabel" defaultValue={initial.webViewLabel} className={field} /></label>
                    <label className="text-xs text-white/45">Download label<input name="downloadLabel" defaultValue={initial.downloadLabel} className={field} /></label>
                    <label className="text-xs text-white/45">Document title<input name="documentTitle" defaultValue={initial.documentTitle} className={field} /></label>
                    <label className="text-xs text-white/45 md:col-span-2">Document description<textarea name="documentDescription" defaultValue={initial.documentDescription} rows={3} className={field} /></label>
                </div>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[11px] text-white/35">{updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : 'Using built-in /resume.pdf defaults until first save.'}</p>
                <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-white/90 disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings</button>
            </div>
        </form>
    );
}

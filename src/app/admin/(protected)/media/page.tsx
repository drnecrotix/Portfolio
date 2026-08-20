import Link from 'next/link';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { isManagedMediaKey, managedMediaBackend, mediaStorageBackend } from '@/lib/media-storage';
import { createMediaAsset, deleteMediaAsset, updateMediaAsset, uploadMediaAsset } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

function formatBytes(size: number) {
    if (!size) return 'unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

type SearchParams = Promise<{ q?: string; type?: string; saved?: string; error?: string }>;

const savedMessages: Record<string, string> = {
    uploaded: 'File uploaded and added to the media library.',
    created: 'External media asset added.',
    updated: 'Media metadata saved.',
    removed: 'Media asset removed.',
};

export default async function MediaLibraryPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const query = String(params.q ?? '').trim();
    const type = ['all', 'image', 'file'].includes(String(params.type)) ? String(params.type) : 'all';

    const where = {
        ...(query ? {
            OR: [
                { fileName: { contains: query, mode: 'insensitive' as const } },
                { altText: { contains: query, mode: 'insensitive' as const } },
                { caption: { contains: query, mode: 'insensitive' as const } },
                { mimeType: { contains: query, mode: 'insensitive' as const } },
            ],
        } : {}),
        ...(type === 'image' ? { mimeType: { startsWith: 'image/' } } : {}),
        ...(type === 'file' ? { NOT: { mimeType: { startsWith: 'image/' } } } : {}),
    };

    const [assets, totalAssets, imageCount, totalBytes] = await Promise.all([
        prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' } }),
        prisma.mediaAsset.count(),
        prisma.mediaAsset.count({ where: { mimeType: { startsWith: 'image/' } } }),
        prisma.mediaAsset.aggregate({ _sum: { size: true } }),
    ]);

    const backend = mediaStorageBackend();
    const savedMessage = params.saved ? savedMessages[params.saved] || 'Changes saved and applied.' : undefined;

    return (
        <div className="max-w-7xl mx-auto">
            <StatusToast type={params.error ? 'error' : savedMessage ? 'success' : undefined} message={params.error || savedMessage} />

            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Media Library</p>
                    <h2 className="mt-2 text-4xl font-semibold">Files & images</h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/45">Upload files directly from the admin panel, browse them as a library and reuse their public URLs across the CMS.</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{assets.length} shown</span>
            </div>

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Total assets', totalAssets],
                    ['Images', imageCount],
                    ['Other files', Math.max(0, totalAssets - imageCount)],
                    ['Stored size', formatBytes(totalBytes._sum.size ?? 0)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
                        <p className="mt-3 text-2xl font-semibold">{value}</p>
                    </div>
                ))}
            </section>

            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Direct upload</h3>
                        <p className="mt-1 text-xs text-white/40">JPG, PNG, WebP, GIF, AVIF, PDF, TXT, Markdown, CSV, JSON, ZIP, DOCX, XLSX and PPTX. Maximum 10 MB per file.</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 px-3 py-1 text-xs text-emerald-300">
                        {backend === 'r2' ? 'Cloudflare R2 storage' : 'Local storage · public/uploads'}
                    </span>
                </div>

                <form action={uploadMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="text-sm text-white/60 md:col-span-2">
                        File
                        <input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,.txt,.md,.csv,.json,.zip,.docx,.xlsx,.pptx,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,text/plain,text/markdown,text/csv,application/json,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation" className={input} />
                    </label>
                    <label className="text-sm text-white/60">Alt text<input name="altText" placeholder="Describe the image for accessibility" className={input} /></label>
                    <label className="text-sm text-white/60">Caption<input name="caption" className={input} /></label>
                    <div className="md:col-span-2">
                        <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Upload file</button>
                    </div>
                </form>
            </section>

            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/media${query ? `?q=${encodeURIComponent(query)}&type=all` : '?type=all'}`} className={`rounded-xl border px-4 py-2 text-sm ${type === 'all' ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/60'}`}>All</Link>
                        <Link href={`/admin/media?type=image${query ? `&q=${encodeURIComponent(query)}` : ''}`} className={`rounded-xl border px-4 py-2 text-sm ${type === 'image' ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/60'}`}>Images</Link>
                        <Link href={`/admin/media?type=file${query ? `&q=${encodeURIComponent(query)}` : ''}`} className={`rounded-xl border px-4 py-2 text-sm ${type === 'file' ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/60'}`}>Other files</Link>
                    </div>
                    <form className="flex min-w-0 flex-1 gap-2 md:max-w-xl">
                        <input type="hidden" name="type" value={type} />
                        <input name="q" defaultValue={query} placeholder="Search library..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none focus:border-white/30" />
                        <button className="rounded-xl border border-white/15 px-4 py-2.5 text-sm">Search</button>
                    </form>
                </div>
            </section>

            {assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center text-sm text-white/35">No matching media assets.</div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {assets.map((asset) => {
                        const isImage = asset.mimeType.startsWith('image/');
                        const managed = isManagedMediaKey(asset.key);
                        const storage = managedMediaBackend(asset.key);

                        return (
                            <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                                {isImage ? (
                                    <div className="flex h-52 items-center justify-center bg-black/25 p-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={asset.url} alt={asset.altText || asset.fileName} className="max-h-full max-w-full rounded-lg object-contain" />
                                    </div>
                                ) : (
                                    <div className="flex h-36 flex-col items-center justify-center gap-2 bg-black/25 px-4 text-center">
                                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/35">FILE</span>
                                        <span className="break-all text-xs text-white/45">{asset.mimeType}</span>
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="mb-5 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="truncate font-semibold">{asset.fileName}</h3>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/40">{storage}</span>
                                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-white/40">{formatBytes(asset.size)}</span>
                                            </div>
                                        </div>
                                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white">Open</a>
                                    </div>

                                    <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-3">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Public URL</p>
                                        <p className="mt-2 break-all font-mono text-[11px] text-white/55">{asset.url}</p>
                                    </div>

                                    <form action={updateMediaAsset.bind(null, asset.id)} className="space-y-4">
                                        <label className="block text-xs text-white/50">File name<input name="fileName" defaultValue={asset.fileName} className={input} /></label>
                                        <label className="block text-xs text-white/50">Alt text<input name="altText" defaultValue={asset.altText ?? ''} className={input} /></label>
                                        <label className="block text-xs text-white/50">Caption<textarea name="caption" rows={2} defaultValue={asset.caption ?? ''} className={input} /></label>
                                        <input type="hidden" name="mimeType" value={asset.mimeType} />
                                        <input type="hidden" name="width" value={asset.width ?? ''} />
                                        <input type="hidden" name="height" value={asset.height ?? ''} />
                                        <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">Save metadata</button>
                                    </form>

                                    <form action={deleteMediaAsset.bind(null, asset.id)} className="mt-4 border-t border-white/10 pt-4">
                                        {managed && (
                                            <label className="mb-3 flex items-center gap-2 text-xs text-white/45">
                                                <input type="checkbox" name="deleteStoredObject" /> Also permanently delete stored file
                                            </label>
                                        )}
                                        <button className="rounded-lg border border-red-500/20 px-4 py-2 text-xs text-red-300 hover:bg-red-500/10">Remove from library</button>
                                    </form>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <details className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <summary className="cursor-pointer text-sm font-semibold text-white/70">Add external asset by URL</summary>
                <form action={createMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm text-white/60">File name<input name="fileName" required placeholder="project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Public URL<input name="url" type="url" required placeholder="https://cdn.example.com/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">Storage key<input name="key" placeholder="external/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">MIME type<input name="mimeType" defaultValue="image/webp" className={input} /></label>
                    <label className="text-sm text-white/60">Size in bytes<input name="size" type="number" min="0" defaultValue="0" className={input} /></label>
                    <label className="text-sm text-white/60">Width<input name="width" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60">Height<input name="height" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Alt text<input name="altText" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-3">Caption<textarea name="caption" rows={2} className={input} /></label>
                    <div className="xl:col-span-3"><button className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">Add external asset</button></div>
                </form>
            </details>
        </div>
    );
}

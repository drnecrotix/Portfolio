import Link from 'next/link';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { isManagedMediaKey, mediaStorageConfigured } from '@/lib/media-storage';
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
    const storageReady = mediaStorageConfigured();
    const savedMessage = params.saved ? savedMessages[params.saved] || 'Changes saved and applied.' : undefined;

    return (
        <div className="max-w-7xl mx-auto">
            <StatusToast
                type={params.error ? 'error' : savedMessage ? 'success' : undefined}
                message={params.error || savedMessage}
            />

            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Media Library</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-semibold">Assets</h2>
                        <p className="mt-2 max-w-2xl text-sm text-white/45">Upload to Cloudflare R2, register controlled external assets and reuse media across the CMS.</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{assets.length} shown</span>
                </div>
            </div>

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Total assets', totalAssets],
                    ['Images', imageCount],
                    ['Other files', Math.max(0, totalAssets - imageCount)],
                    ['Stored metadata size', formatBytes(totalBytes._sum.size ?? 0)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
                        <p className="mt-3 text-2xl font-semibold">{value}</p>
                    </div>
                ))}
            </section>

            <form className="mb-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:flex-row md:items-center">
                <input name="q" defaultValue={query} placeholder="Search file name, alt text, caption or MIME type..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-white/30" />
                <select name="type" defaultValue={type} className="rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm">
                    <option value="all">All types</option>
                    <option value="image">Images</option>
                    <option value="file">Other files</option>
                </select>
                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Filter</button>
                {(query || type !== 'all') && <Link href="/admin/media" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-white/55 hover:text-white">Reset</Link>}
            </form>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Direct upload</h3>
                        <p className="mt-1 text-xs text-white/40">Uploads JPG, PNG, WebP, GIF, AVIF, PDF, TXT, Markdown, CSV, JSON, ZIP, DOCX, XLSX or PPTX directly to the configured R2 bucket. Maximum 10 MB.</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${storageReady ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>
                        {storageReady ? 'R2 configured' : 'R2 not configured'}
                    </span>
                </div>
                {storageReady ? (
                    <form action={uploadMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2">
                        <label className="text-sm text-white/60 md:col-span-2">File<input name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.pdf,.txt,.md,.csv,.json,.zip,.docx,.xlsx,.pptx,image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf,text/plain,text/markdown,text/csv,application/json,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation" className={input} /></label>
                        <label className="text-sm text-white/60">Alt text<input name="altText" placeholder="Describe the image for accessibility" className={input} /></label>
                        <label className="text-sm text-white/60">Caption<input name="caption" className={input} /></label>
                        <div className="md:col-span-2"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Upload to R2</button></div>
                    </form>
                ) : (
                    <div className="mt-5 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-4 text-xs leading-relaxed text-amber-100/70">
                        Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL to enable direct uploads.
                    </div>
                )}
            </section>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="text-lg font-semibold">Register external asset</h3>
                <p className="mt-1 text-xs text-white/40">Use a public HTTPS URL from an existing CDN, R2 bucket or other controlled source.</p>
                <form action={createMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm text-white/60">File name<input name="fileName" required placeholder="project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Public URL<input name="url" type="url" required placeholder="https://cdn.example.com/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">Storage key<input name="key" placeholder="external/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">MIME type<input name="mimeType" defaultValue="image/webp" className={input} /></label>
                    <label className="text-sm text-white/60">Size in bytes<input name="size" type="number" min="0" defaultValue="0" className={input} /></label>
                    <label className="text-sm text-white/60">Width<input name="width" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60">Height<input name="height" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Alt text<input name="altText" placeholder="Describe the image for accessibility" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-3">Caption<textarea name="caption" rows={2} className={input} /></label>
                    <div className="xl:col-span-3"><button className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">Add external asset</button></div>
                </form>
            </section>

            {assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center text-sm text-white/35">No matching media assets.</div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {assets.map((asset) => {
                        const isImage = asset.mimeType.startsWith('image/');
                        const managed = isManagedMediaKey(asset.key);
                        return (
                            <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                                {isImage ? (
                                    <div className="flex h-56 items-center justify-center bg-black/25 p-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={asset.url} alt={asset.altText || asset.fileName} className="max-h-full max-w-full rounded-lg object-contain" />
                                    </div>
                                ) : (
                                    <div className="flex h-28 items-center justify-center bg-black/25 font-mono text-xs uppercase tracking-[0.25em] text-white/35">{asset.mimeType}</div>
                                )}

                                <div className="p-5">
                                    <div className="mb-5 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="truncate font-semibold">{asset.fileName}</h3>
                                                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${managed ? 'border-emerald-400/20 text-emerald-300/80' : 'border-white/10 text-white/35'}`}>{managed ? 'Managed R2' : 'External'}</span>
                                            </div>
                                            <p className="mt-1 truncate font-mono text-[10px] text-white/35">{asset.key}</p>
                                            <p className="mt-2 text-xs text-white/40">{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}{formatBytes(asset.size)}</p>
                                        </div>
                                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white">Open</a>
                                    </div>

                                    <form action={updateMediaAsset.bind(null, asset.id)} className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="text-xs text-white/50">File name<input name="fileName" defaultValue={asset.fileName} className={input} /></label>
                                            <label className="text-xs text-white/50">MIME type<input name="mimeType" defaultValue={asset.mimeType} className={input} /></label>
                                            <label className="text-xs text-white/50">Width<input name="width" type="number" min="0" defaultValue={asset.width ?? ''} className={input} /></label>
                                            <label className="text-xs text-white/50">Height<input name="height" type="number" min="0" defaultValue={asset.height ?? ''} className={input} /></label>
                                        </div>
                                        <label className="block text-xs text-white/50">Alt text<input name="altText" defaultValue={asset.altText ?? ''} className={input} /></label>
                                        <label className="block text-xs text-white/50">Caption<textarea name="caption" rows={2} defaultValue={asset.caption ?? ''} className={input} /></label>
                                        <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">Save metadata</button>
                                    </form>

                                    <form action={deleteMediaAsset.bind(null, asset.id)} className="mt-4 border-t border-white/10 pt-4">
                                        {managed && (
                                            <label className="mb-3 flex items-center gap-2 text-xs text-white/45">
                                                <input type="checkbox" name="deleteStoredObject" />
                                                Also permanently delete the R2 object
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
        </div>
    );
}

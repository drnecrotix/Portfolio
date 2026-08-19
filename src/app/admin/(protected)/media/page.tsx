import { prisma } from '@/lib/prisma';
import { createMediaAsset, deleteMediaAsset, updateMediaAsset } from './actions';

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

export default async function MediaLibraryPage() {
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Media Library</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-4xl font-semibold">Assets</h2>
                        <p className="mt-2 max-w-2xl text-sm text-white/45">Register reusable images and files once, then use their public URL across projects, posts, pages and homepage content.</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">{assets.length} assets</span>
                </div>
            </div>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="text-lg font-semibold">Add media asset</h3>
                <p className="mt-1 text-xs text-white/40">Use a public HTTPS URL from Cloudflare R2, S3, CDN or another controlled source.</p>
                <form action={createMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm text-white/60">File name<input name="fileName" required placeholder="project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Public URL<input name="url" type="url" required placeholder="https://cdn.example.com/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">Storage key<input name="key" placeholder="projects/project-cover.webp" className={input} /></label>
                    <label className="text-sm text-white/60">MIME type<input name="mimeType" defaultValue="image/webp" className={input} /></label>
                    <label className="text-sm text-white/60">Size in bytes<input name="size" type="number" min="0" defaultValue="0" className={input} /></label>
                    <label className="text-sm text-white/60">Width<input name="width" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60">Height<input name="height" type="number" min="0" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Alt text<input name="altText" placeholder="Describe the image for accessibility" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-3">Caption<textarea name="caption" rows={2} className={input} /></label>
                    <div className="xl:col-span-3"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Add asset</button></div>
                </form>
            </section>

            {assets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center text-sm text-white/35">No media assets yet.</div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {assets.map((asset) => {
                        const isImage = asset.mimeType.startsWith('image/');
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
                                            <h3 className="truncate font-semibold">{asset.fileName}</h3>
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
                                        <div className="flex flex-wrap gap-3">
                                            <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">Save metadata</button>
                                        </div>
                                    </form>

                                    <form action={deleteMediaAsset.bind(null, asset.id)} className="mt-3">
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

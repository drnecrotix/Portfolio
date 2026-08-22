'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type MediaAsset = {
    id: string;
    fileName: string;
    mimeType: string;
    url: string;
    altText?: string | null;
};

type MediaKind = 'all' | 'image' | 'video' | 'file';
type PickerTab = 'library' | 'upload';

type Props = {
    value?: string;
    onChange?: (url: string) => void;
    inputName?: string;
    label?: string;
    initialKind?: MediaKind;
    lockKind?: boolean;
};

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogg,.ogv,.mov,.m4v';
const ZIP_ACCEPT = 'application/zip,application/x-zip-compressed,.zip';

function acceptsForKind(kind: MediaKind) {
    if (kind === 'image') return IMAGE_ACCEPT;
    if (kind === 'video') return VIDEO_ACCEPT;
    if (kind === 'file') return ZIP_ACCEPT;
    return `${IMAGE_ACCEPT},${VIDEO_ACCEPT},${ZIP_ACCEPT}`;
}

export function MediaPicker({ value = '', onChange, inputName, label = 'Media', initialKind = 'all', lockKind = false }: Props) {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [internalSelected, setInternalSelected] = useState(value);
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<PickerTab>('library');
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<MediaKind>(initialKind);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadMessage, setUploadMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const selected = onChange ? value : internalSelected;
    const activeKind = lockKind ? initialKind : kind;

    useEffect(() => {
        fetch('/api/media', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : [])
            .then((data) => setAssets(Array.isArray(data) ? data : []))
            .catch(() => setAssets([]));
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return assets.filter((asset) => {
            const isImage = asset.mimeType.startsWith('image/');
            const isVideo = asset.mimeType.startsWith('video/');
            const typeMatch = activeKind === 'all'
                || (activeKind === 'image' && isImage)
                || (activeKind === 'video' && isVideo)
                || (activeKind === 'file' && !isImage && !isVideo);
            const queryMatch = !q
                || asset.fileName.toLowerCase().includes(q)
                || asset.altText?.toLowerCase().includes(q)
                || asset.mimeType.toLowerCase().includes(q);
            return typeMatch && queryMatch;
        });
    }, [activeKind, assets, query]);

    const setSelection = (url: string) => {
        if (!onChange) setInternalSelected(url);
        onChange?.(url);
    };

    const choose = (url: string) => {
        setSelection(url);
        setOpen(false);
    };

    const clear = () => setSelection('');

    const uploadFile = async (file: File) => {
        setUploading(true);
        setUploadError('');
        setUploadMessage('');
        try {
            const formData = new FormData();
            formData.set('file', file);
            const response = await fetch('/api/media', { method: 'POST', body: formData });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed.');
            const asset = data as MediaAsset;
            setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
            setSelection(asset.url);
            setUploadMessage(`${asset.fileName} uploaded and selected.`);
            setTab('library');
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-w-0 space-y-2 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-white/60">{label}</span>
                <div className="flex flex-wrap gap-2">
                    {selected && (
                        <button type="button" onClick={clear} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">
                            Clear selection
                        </button>
                    )}
                    <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white">
                        {open ? 'Close media' : 'Select media'}
                    </button>
                </div>
            </div>
            {inputName && <input type="hidden" name={inputName} value={selected} />}
            {selected && (
                <div className="flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    {activeKind === 'video' ? (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] font-medium uppercase tracking-wider text-white/40">Video</div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected} alt="Selected media preview" className="h-14 w-20 shrink-0 rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-white/60" title={selected}>{selected}</span>
                </div>
            )}
            {open && (
                <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 shadow-2xl">
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
                        <button type="button" onClick={() => setTab('library')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === 'library' ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}>Media Library</button>
                        <button type="button" onClick={() => setTab('upload')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === 'upload' ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}>Upload files</button>
                    </div>

                    {tab === 'upload' ? (
                        <div className="min-w-0 py-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={acceptsForKind(activeKind)}
                                disabled={uploading}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void uploadFile(file);
                                }}
                                className="block w-full min-w-0 cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-5 text-xs text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black hover:border-white/30"
                            />
                            <p className="mt-3 text-[11px] leading-relaxed text-white/30">Allowed: images, videos and ZIP archives. Maximum file size: 10 MB.</p>
                            {uploading && <p className="mt-3 break-words text-xs text-sky-300">Uploading and adding to library…</p>}
                            {uploadError && <p className="mt-3 max-w-full break-words text-xs text-red-300">{uploadError}</p>}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row">
                                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30" />
                                {!lockKind && (
                                    <div className="flex flex-wrap gap-2">
                                        {(['all', 'image', 'video', 'file'] as const).map((value) => (
                                            <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-lg border px-3 py-2 text-xs capitalize ${activeKind === value ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/55 hover:bg-white/[0.05]'}`}>
                                                {value === 'file' ? 'zip' : value}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {uploadMessage && <p className="mb-3 max-w-full break-all text-xs leading-relaxed text-emerald-300">{uploadMessage}</p>}
                            <div className="grid max-h-80 min-w-0 grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3">
                                {filtered.map((asset) => (
                                    <button key={asset.id} type="button" onClick={() => choose(asset.url)} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-white/30">
                                        {asset.mimeType.startsWith('image/') ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={asset.url} alt={asset.altText || asset.fileName} className="aspect-video w-full object-cover" />
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center text-xs text-white/35">{asset.mimeType.startsWith('video/') ? 'VIDEO' : 'ZIP'}</div>
                                        )}
                                        <div className="truncate px-3 pt-2 text-xs text-white/70" title={asset.fileName}>{asset.fileName}</div>
                                        <div className="truncate px-3 pb-2 pt-1 font-mono text-[10px] text-white/30">{asset.mimeType}</div>
                                    </button>
                                ))}
                            </div>
                            {filtered.length === 0 && <p className="py-10 text-center text-xs text-white/35">No matching media.</p>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

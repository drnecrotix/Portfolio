'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type MediaAsset = {
    id: string;
    fileName: string;
    mimeType: string;
    url: string;
    altText?: string | null;
};

type MediaKind = 'all' | 'image' | 'file';
type PickerTab = 'library' | 'upload';

type Props = {
    value?: string;
    onChange?: (url: string) => void;
    inputName?: string;
    label?: string;
    initialKind?: MediaKind;
    lockKind?: boolean;
};

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

    useEffect(() => {
        fetch('/api/media', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : [])
            .then((data) => setAssets(Array.isArray(data) ? data : []))
            .catch(() => setAssets([]));
    }, []);

    useEffect(() => {
        if (!onChange) setInternalSelected(value);
    }, [onChange, value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return assets.filter((asset) => {
            const typeMatch = kind === 'all'
                || (kind === 'image' && asset.mimeType.startsWith('image/'))
                || (kind === 'file' && !asset.mimeType.startsWith('image/'));
            const queryMatch = !q
                || asset.fileName.toLowerCase().includes(q)
                || asset.altText?.toLowerCase().includes(q)
                || asset.mimeType.toLowerCase().includes(q);
            return typeMatch && queryMatch;
        });
    }, [assets, kind, query]);

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
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-white/60">{label}</span>
                <div className="flex gap-2">
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
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected} alt="Selected media preview" className="h-14 w-20 rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    <input readOnly value={selected} className="min-w-0 flex-1 bg-transparent text-xs text-white/60 outline-none" />
                </div>
            )}
            {open && (
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 shadow-2xl">
                    <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
                        <button type="button" onClick={() => setTab('library')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === 'library' ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}>Media Library</button>
                        <button type="button" onClick={() => setTab('upload')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${tab === 'upload' ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}>Upload files</button>
                    </div>

                    {tab === 'upload' ? (
                        <div className="py-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={lockKind || kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif,image/avif' : undefined}
                                disabled={uploading}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void uploadFile(file);
                                }}
                                className="block w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-5 text-xs text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-black hover:border-white/30"
                            />
                            <p className="mt-3 text-[11px] leading-relaxed text-white/30">Upload directly to the shared Media Library. Maximum file size: 10 MB.</p>
                            {uploading && <p className="mt-3 text-xs text-sky-300">Uploading and adding to library…</p>}
                            {uploadError && <p className="mt-3 text-xs text-red-300">{uploadError}</p>}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30" />
                                {!lockKind && (
                                    <div className="flex gap-2">
                                        {(['all', 'image', 'file'] as const).map((value) => (
                                            <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-lg border px-3 py-2 text-xs capitalize ${kind === value ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/55 hover:bg-white/[0.05]'}`}>
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {uploadMessage && <p className="mb-3 text-xs text-emerald-300">{uploadMessage}</p>}
                            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3">
                                {filtered.map((asset) => (
                                    <button key={asset.id} type="button" onClick={() => choose(asset.url)} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-white/30">
                                        {asset.mimeType.startsWith('image/') ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={asset.url} alt={asset.altText || asset.fileName} className="aspect-video w-full object-cover" />
                                        ) : (
                                            <div className="flex aspect-video items-center justify-center text-xs text-white/35">FILE</div>
                                        )}
                                        <div className="truncate px-3 pt-2 text-xs text-white/70">{asset.fileName}</div>
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

'use client';

import { useEffect, useMemo, useState } from 'react';

type MediaAsset = {
    id: string;
    fileName: string;
    mimeType: string;
    url: string;
    altText?: string | null;
};

type Props = {
    value?: string;
    onChange?: (url: string) => void;
    inputName?: string;
    label?: string;
};

export function MediaPicker({ value = '', onChange, inputName, label = 'Media' }: Props) {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [internalSelected, setInternalSelected] = useState(value);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<'all' | 'image' | 'file'>('all');
    const selected = onChange ? value : internalSelected;

    useEffect(() => {
        fetch('/api/media', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : [])
            .then((data) => setAssets(Array.isArray(data) ? data : []))
            .catch(() => setAssets([]));
    }, []);

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
                    <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                        {open ? 'Close library' : 'Choose from library'}
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
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30" />
                        <div className="flex gap-2">
                            {(['all', 'image', 'file'] as const).map((value) => (
                                <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-lg border px-3 py-2 text-xs capitalize ${kind === value ? 'border-white/40 bg-white text-black' : 'border-white/10 text-white/55'}`}>
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>
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
                </div>
            )}
        </div>
    );
}

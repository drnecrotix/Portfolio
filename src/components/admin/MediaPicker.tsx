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
    const [selected, setSelected] = useState(value);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        fetch('/api/media', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : [])
            .then((data) => setAssets(Array.isArray(data) ? data : []))
            .catch(() => setAssets([]));
    }, []);

    useEffect(() => setSelected(value), [value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q
            ? assets.filter((asset) => asset.fileName.toLowerCase().includes(q) || asset.altText?.toLowerCase().includes(q))
            : assets;
    }, [assets, query]);

    const choose = (url: string) => {
        setSelected(url);
        onChange?.(url);
        setOpen(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/60">{label}</span>
                <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                    {open ? 'Close library' : 'Choose from library'}
                </button>
            </div>
            {inputName && <input type="hidden" name={inputName} value={selected} />}
            {selected && <input readOnly value={selected} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60" />}
            {open && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media..." className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30" />
                    <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3">
                        {filtered.map((asset) => (
                            <button key={asset.id} type="button" onClick={() => choose(asset.url)} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-white/30">
                                {asset.mimeType.startsWith('image/') ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={asset.url} alt={asset.altText || asset.fileName} className="aspect-video w-full object-cover" />
                                ) : (
                                    <div className="flex aspect-video items-center justify-center text-xs text-white/35">FILE</div>
                                )}
                                <div className="truncate px-3 py-2 text-xs text-white/70">{asset.fileName}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

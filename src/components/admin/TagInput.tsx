'use client';

import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';

type Props = {
    name: string;
    initialTags?: string[];
    label?: string;
};

function normalizeTag(value: string) {
    return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function TagInput({ name, initialTags = [], label = 'Tags' }: Props) {
    const [tags, setTags] = useState(() => Array.from(new Set(initialTags.map(normalizeTag).filter(Boolean))));
    const [draft, setDraft] = useState('');

    const addDraft = () => {
        const parts = draft.split(',').map(normalizeTag).filter(Boolean);
        if (parts.length === 0) return;
        setTags((current) => Array.from(new Set([...current, ...parts])));
        setDraft('');
    };

    const removeTag = (tag: string) => {
        setTags((current) => current.filter((item) => item !== tag));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addDraft();
            return;
        }
        if (event.key === 'Backspace' && !draft && tags.length > 0) {
            setTags((current) => current.slice(0, -1));
        }
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs text-white/45">{label}</span>
                <span className="text-[10px] text-white/25">Press Enter or comma</span>
            </div>
            <input type="hidden" name={name} value={tags.join(', ')} />
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-2 transition focus-within:border-white/30 focus-within:bg-white/[0.05]">
                {tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.07] px-2 py-1 text-[11px] text-white/75">
                                <span>{tag}</span>
                                <button type="button" onClick={() => removeTag(tag)} className="rounded p-0.5 text-white/35 transition hover:bg-white/10 hover:text-white" aria-label={`Remove ${tag}`}>
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => { if (draft.trim()) addDraft(); }}
                        placeholder="Add tag"
                        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button type="button" onClick={addDraft} disabled={!draft.trim()} className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                        <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/25">Separate concepts into individual tags. Existing tags can be removed with ×.</p>
        </div>
    );
}

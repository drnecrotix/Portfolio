'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';

type Props = {
    name?: string;
    initialTags?: string[];
    value?: string[];
    onChange?: (tags: string[]) => void;
    label?: string;
    helperText?: string;
    maxTags?: number;
    maxLength?: number;
    stripHash?: boolean;
};

function normalizeTag(value: string, maxLength: number, stripHash: boolean) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return (stripHash ? normalized.replace(/^#+/, '') : normalized).slice(0, maxLength);
}

export function TagInput({
    name,
    initialTags = [],
    value,
    onChange,
    label = 'Tags',
    helperText = 'Separate concepts into individual tags. Existing tags can be removed with ×.',
    maxTags = 50,
    maxLength = 80,
    stripHash = false,
}: Props) {
    const controlled = Array.isArray(value);
    const normalize = (tag: string) => normalizeTag(tag, maxLength, stripHash);
    const [internalTags, setInternalTags] = useState(() => Array.from(new Set(initialTags.map(normalize).filter(Boolean))).slice(0, maxTags));
    const [draft, setDraft] = useState('');
    const tags = controlled ? value.map(normalize).filter(Boolean).slice(0, maxTags) : internalTags;

    useEffect(() => {
        if (!controlled) return;
        setDraft('');
    }, [controlled, value]);

    const commit = (next: string[]) => {
        const normalized = Array.from(new Set(next.map(normalize).filter(Boolean))).slice(0, maxTags);
        if (!controlled) setInternalTags(normalized);
        onChange?.(normalized);
    };

    const addDraft = () => {
        const parts = draft.split(',').map(normalize).filter(Boolean);
        if (parts.length === 0) return;
        commit([...tags, ...parts]);
        setDraft('');
    };

    const removeTag = (tag: string) => commit(tags.filter((item) => item !== tag));

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addDraft();
            return;
        }
        if (event.key === 'Backspace' && !draft && tags.length > 0) {
            commit(tags.slice(0, -1));
        }
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground/60">Enter or comma · {tags.length}/{maxTags}</span>
            </div>
            {name && <input type="hidden" name={name} value={tags.join(', ')} />}
            <div className="rounded-xl border border-foreground/10 bg-background p-2 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/5">
                {tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.06] px-2 py-1 text-[11px] text-foreground/80">
                                <span>{stripHash ? '#' : ''}{tag}</span>
                                <button type="button" onClick={() => removeTag(tag)} className="rounded p-0.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground" aria-label={`Remove ${tag}`}>
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
                        className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                    <button type="button" onClick={addDraft} disabled={!draft.trim() || tags.length >= maxTags} className="inline-flex h-8 items-center gap-1 rounded-lg border border-foreground/10 px-2.5 text-[11px] font-medium text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30">
                        <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/60">{helperText}</p>
        </div>
    );
}

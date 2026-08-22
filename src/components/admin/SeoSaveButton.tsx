'use client';

import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function SeoSaveButton() {
    const { pending } = useFormStatus();

    return (
        <button disabled={pending} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition disabled:cursor-wait disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? 'Saving SEO settings…' : 'Save SEO settings'}
        </button>
    );
}

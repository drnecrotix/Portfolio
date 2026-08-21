'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAdminComment } from '@/app/admin/(protected)/comments/actions';

export function AdminCommentDeleteButton({ commentId, authorName }: { commentId: string; authorName: string }) {
    const [pending, startTransition] = useTransition();

    const remove = () => {
        const confirmed = window.confirm(`Delete this comment by ${authorName}? Replies below a parent comment will also be deleted.`);
        if (!confirmed) return;
        startTransition(async () => {
            await deleteAdminComment(commentId);
        });
    };

    return (
        <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Delete comment by ${authorName}`}
            title="Delete comment"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );
}

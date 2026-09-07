'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function requireCommentAdmin() {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user || (role !== 'OWNER' && role !== 'ADMIN')) {
        throw new Error('You do not have permission to moderate comments.');
    }
}

function cleanIds(values: string[]) {
    return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).slice(0, 250);
}

async function revalidateSources(ids: string[]) {
    const rows = await prisma.blogComment.findMany({
        where: { id: { in: ids } },
        select: { sourcePath: true },
    });
    revalidatePath('/admin/comments');
    for (const path of new Set(rows.map((row) => row.sourcePath).filter(Boolean))) revalidatePath(path);
}

export async function deleteAdminComment(commentId: string) {
    await requireCommentAdmin();
    const ids = cleanIds([commentId]);
    if (!ids.length) return;
    await revalidateSources(ids);
    await prisma.blogComment.deleteMany({ where: { id: { in: ids } } });
    revalidatePath('/admin/comments');
}

export async function bulkModerateComments(commentIds: string[], action: 'approve' | 'spam' | 'delete') {
    await requireCommentAdmin();
    const ids = cleanIds(commentIds);
    if (!ids.length) return { count: 0 };

    const rows = await prisma.blogComment.findMany({
        where: { id: { in: ids } },
        select: { id: true, sourcePath: true },
    });
    if (!rows.length) return { count: 0 };

    if (action === 'delete') {
        await prisma.blogComment.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    } else if (action === 'spam') {
        await prisma.blogComment.updateMany({
            where: { id: { in: rows.map((row) => row.id) } },
            data: { status: 'SPAM', spamAt: new Date() },
        });
    } else {
        await prisma.blogComment.updateMany({
            where: { id: { in: rows.map((row) => row.id) } },
            data: { status: 'APPROVED', spamAt: null },
        });
    }

    revalidatePath('/admin/comments');
    for (const path of new Set(rows.map((row) => row.sourcePath).filter(Boolean))) revalidatePath(path);
    return { count: rows.length };
}

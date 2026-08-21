'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function deleteAdminComment(commentId: string) {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user || (role !== 'OWNER' && role !== 'ADMIN')) {
        throw new Error('You do not have permission to delete comments.');
    }

    const id = String(commentId || '').trim();
    if (!id) throw new Error('Missing comment ID.');

    const comment = await prisma.blogComment.findUnique({
        where: { id },
        select: { id: true, post: { select: { slug: true } } },
    });
    if (!comment) return;

    await prisma.blogComment.delete({ where: { id } });

    revalidatePath('/admin/comments');
    revalidatePath(`/blog/${comment.post.slug}`);
}

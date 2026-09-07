import { prisma } from '@/lib/prisma';
import type { CommentSourceType } from '@/lib/comment-engine';
import { CommentsEngine, type PublicComment } from '@/components/comments/CommentsEngine';

export async function CommentsSection({ sourceType, sourceKey }: { sourceType: CommentSourceType; sourceKey: string }) {
    const rows = await prisma.blogComment.findMany({
        where: {
            sourceType,
            sourceKey,
            status: 'APPROVED',
        },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            parentId: true,
            authorName: true,
            content: true,
            createdAt: true,
        },
    });

    const comments: PublicComment[] = rows.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
    }));

    return <CommentsEngine sourceType={sourceType} sourceKey={sourceKey} initialComments={comments} />;
}

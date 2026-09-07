import type { ReactNode } from 'react';
import { CommentsSection } from '@/components/comments/CommentsSection';

export default async function GalleryWorkLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <>
            {children}
            <div className="bg-background px-5 pb-24 text-foreground sm:px-8 lg:px-10">
                <div className="mx-auto max-w-[1180px]">
                    <CommentsSection sourceType="GALLERY" sourceKey={slug} />
                </div>
            </div>
        </>
    );
}

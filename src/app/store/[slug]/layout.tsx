import type { ReactNode } from 'react';
import { CommentsSection } from '@/components/comments/CommentsSection';

export default async function StoreProductLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <>
            {children}
            <div className="bg-background px-4 pb-24 text-foreground sm:px-7 md:px-10 lg:px-14 xl:px-20">
                <div className="mx-auto w-full max-w-[1180px]">
                    <CommentsSection sourceType="PRODUCT" sourceKey={slug} />
                </div>
            </div>
        </>
    );
}

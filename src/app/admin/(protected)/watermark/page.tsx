import { ContentWatermarkEditor } from '@/components/admin/ContentWatermarkEditor';
import { prisma } from '@/lib/prisma';
import { CONTENT_WATERMARK_CONFIG_SLUG, normalizeContentWatermarkSettings } from '@/lib/content-watermark';

export const dynamic = 'force-dynamic';

export default async function ContentWatermarkAdminPage() {
    const page = await prisma.page.findUnique({
        where: { slug: CONTENT_WATERMARK_CONFIG_SLUG },
        select: { content: true, updatedAt: true },
    }).catch(() => null);

    const settings = normalizeContentWatermarkSettings(page?.content);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Appearance</p>
                <h2 className="mt-1 text-3xl font-semibold">Content Watermark</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A single non-destructive watermark shared by Blog article images, Project images and the public Gallery listing. Individual Gallery work pages keep their existing per-work copyright watermark in the dedicated viewer.</p>
            </div>
            <ContentWatermarkEditor initial={settings} updatedAt={page?.updatedAt.toISOString() ?? null} />
        </div>
    );
}

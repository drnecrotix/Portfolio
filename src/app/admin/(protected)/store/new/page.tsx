import Link from 'next/link';
import { StoreProductForm } from '@/components/admin/StoreProductForm';
import { getRuntimeR2Config } from '@/lib/integration-runtime';
import { createStoreProduct } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewStoreProductPage() {
    const r2 = await getRuntimeR2Config();
    const storageConfigured = Boolean(r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.storeBucket);

    return (
        <div className="mx-auto max-w-5xl">
            <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Digital Store</p><h1 className="mt-2 text-3xl font-bold tracking-tight">New product</h1></div>
                <Link href="/admin/store" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back to Store</Link>
            </header>
            <StoreProductForm action={createStoreProduct} storageConfigured={storageConfigured} storeBucket={r2.storeBucket || null} />
        </div>
    );
}

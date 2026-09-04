import Link from 'next/link';
import { StoreProductForm } from '@/components/admin/StoreProductForm';
import { getLocalStoreStorageStatus } from '@/lib/store-storage';
import { createStoreProduct } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewStoreProductPage() {
    const storage = await getLocalStoreStorageStatus();

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Digital Store</p><h1 className="mt-2 text-3xl font-bold tracking-tight">New product</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create a premium Store listing, connect checkout and choose private upload or masked link delivery without leaving the editor.</p></div>
                <Link href="/admin/store" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back to Store</Link>
            </header>
            <StoreProductForm action={createStoreProduct} storageConfigured={storage.ready} storeBucket={storage.label} />
        </div>
    );
}

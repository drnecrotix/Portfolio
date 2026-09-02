'use client';

// Temporary v1.1.84 compatibility shim.
// v1.1.83 removed the legacy editor, but older production updaters mirrored
// release files without deleting removed paths. Keeping this valid module for
// one release lets those installations overwrite the stale v1.1.82 copy and
// complete the first build. The v1.1.84 updater now prunes obsolete files, so
// this shim can be deleted safely in a later release.
export { PersonalWikiMainEditor as PersonalWikiEditor } from '@/components/admin/PersonalWikiMainEditor';

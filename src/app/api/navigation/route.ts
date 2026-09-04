import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessManagedPage, getManagedPageAccessSettings, type ManagedPageKey } from '@/lib/page-access';

const LEGACY_PAGE_TITLE = 'Experience page configuration';

type PublicNavigationItem = {
    id: string;
    label: string;
    href: string;
    location: string;
    sortOrder: number;
    isVisible: boolean;
    isExternal: boolean;
    isDropdown: boolean;
    dropdownStyle: string;
    parentId: string | null;
};

const fallback: PublicNavigationItem[] = [
    { id: 'home', label: 'Home', href: '/', location: 'primary', sortOrder: 10, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
    { id: 'about', label: 'About', href: '#', location: 'primary', sortOrder: 20, isVisible: true, isExternal: false, isDropdown: true, dropdownStyle: 'auto', parentId: null },
    { id: 'achievements', label: 'Achievements', href: '/achievements', location: 'primary', sortOrder: 10, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'lab', label: 'Lab', href: '/lab', location: 'primary', sortOrder: 20, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'experience', label: 'Journey', href: '/journey', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'projects', label: 'Projects', href: '/projects', location: 'primary', sortOrder: 40, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'blog', label: 'Blog', href: '/blog', location: 'primary', sortOrder: 50, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'store', label: 'Store', href: '/store', location: 'primary', sortOrder: 25, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
];

export const dynamic = 'force-dynamic';

function managedKeyFromHref(href: string): ManagedPageKey | null {
    const path = href.split(/[?#]/, 1)[0] || '';
    if (path === '/wiki' || path.startsWith('/wiki/')) return 'wiki';
    if (path === '/blog' || path.startsWith('/blog/')) return 'blog';
    if (path === '/gallery' || path.startsWith('/gallery/')) return 'gallery';
    if (path === '/store' || path.startsWith('/store/')) return 'store';
    return null;
}

export async function GET() {
    const [pageAccess, session] = await Promise.all([
        getManagedPageAccessSettings(),
        auth().catch(() => null),
    ]);
    const isAdmin = Boolean(session?.user && ['OWNER', 'ADMIN'].includes(session.user.role));
    const allowed = (item: PublicNavigationItem) => {
        const key = managedKeyFromHref(item.href);
        return !key || canAccessManagedPage(pageAccess, key, isAdmin);
    };

    try {
        const [items, journeyPage] = await Promise.all([
            prisma.navigationItem.findMany({ where: { isVisible: true }, orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] }),
            prisma.page.findUnique({ where: { slug: '__experience-config' }, select: { title: true } }).catch(() => null),
        ]);
        const pageName = journeyPage?.title && journeyPage.title !== LEGACY_PAGE_TITLE ? journeyPage.title : 'Journey';
        const normalized = items.map((item): PublicNavigationItem => {
            const base: PublicNavigationItem = {
                id: item.id,
                label: item.label,
                href: item.href,
                location: item.location,
                sortOrder: item.sortOrder,
                isVisible: item.isVisible,
                isExternal: item.isExternal,
                isDropdown: item.isDropdown,
                dropdownStyle: item.dropdownStyle,
                parentId: item.parentId,
            };

            const journeyItem = item.id === 'experience' || item.href === '/experience' || item.href === '/journey';
            if (journeyItem) return { ...base, label: pageName, href: '/journey' };
            const labItem = item.id === 'skills' || item.id === 'lab' || item.href === '/skills' || item.href === '/lab';
            return labItem ? { ...base, label: item.label === 'Skills' ? 'Lab' : item.label, href: '/lab' } : base;
        }).filter(allowed);

        const visibleFallback = fallback
            .map((item) => item.id === 'experience' ? { ...item, label: pageName } : item)
            .filter(allowed);

        return NextResponse.json(normalized.length ? normalized : visibleFallback, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch {
        return NextResponse.json(fallback.filter(allowed), { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}

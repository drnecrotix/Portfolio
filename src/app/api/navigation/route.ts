import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
];

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [items, journeyPage] = await Promise.all([
            prisma.navigationItem.findMany({ where: { isVisible: true }, orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] }),
            prisma.page.findUnique({ where: { slug: '__experience-config' }, select: { title: true } }).catch(() => null),
        ]);
        const pageName = journeyPage?.title && journeyPage.title !== LEGACY_PAGE_TITLE ? journeyPage.title : 'Journey';
        const normalized = items.map((item): PublicNavigationItem | null => {
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

            // v1.1.82 briefly created Wiki automatically at sort order 25. Hide that legacy
            // signature so v1.1.83 can be fully manual. A manually added Wiki link with a
            // user-chosen position/order remains untouched.
            if (base.href === '/wiki' && base.label === 'Wiki' && base.sortOrder === 25) return null;

            const journeyItem = item.id === 'experience' || item.href === '/experience' || item.href === '/journey';
            if (journeyItem) return { ...base, label: pageName, href: '/journey' };
            const labItem = item.id === 'skills' || item.id === 'lab' || item.href === '/skills' || item.href === '/lab';
            return labItem ? { ...base, label: item.label === 'Skills' ? 'Lab' : item.label, href: '/lab' } : base;
        }).filter((item): item is PublicNavigationItem => Boolean(item));

        return NextResponse.json(normalized.length ? normalized : fallback.map((item) => item.id === 'experience' ? { ...item, label: pageName } : item), {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch {
        return NextResponse.json(fallback, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
}

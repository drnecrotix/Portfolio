import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const fallback = [
    { id: 'home', label: 'Home', href: '/', location: 'primary', sortOrder: 0, isVisible: true, isExternal: false, parentId: null },
    { id: 'about', label: 'About', href: '/about', location: 'primary', sortOrder: 50, isVisible: true, isExternal: false, parentId: null },
    { id: 'achievements', label: 'Achievements', href: '/achievements', location: 'primary', sortOrder: 10, isVisible: true, isExternal: false, parentId: 'about' },
    { id: 'skills', label: 'Skills', href: '/skills', location: 'primary', sortOrder: 20, isVisible: true, isExternal: false, parentId: 'about' },
    { id: 'experience', label: 'Experience', href: '/experience', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, parentId: 'about' },
    { id: 'projects', label: 'Projects', href: '/projects', location: 'primary', sortOrder: 40, isVisible: true, isExternal: false, parentId: 'about' },
    { id: 'blog', label: 'Blog', href: '/blog', location: 'primary', sortOrder: 50, isVisible: true, isExternal: false, parentId: 'about' },
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 100, isVisible: true, isExternal: false, parentId: null },
];

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const items = await prisma.navigationItem.findMany({
            where: { isVisible: true },
            orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        return NextResponse.json(items.length ? items : fallback, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch {
        return NextResponse.json(fallback, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    }
}

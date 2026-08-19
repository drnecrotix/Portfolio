import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const fallback = [
    { id: 'home', label: 'Home', href: '/', location: 'primary', sortOrder: 0, isVisible: true, isExternal: false },
    { id: 'achievements', label: 'Achievements', href: '/achievements', location: 'about', sortOrder: 10, isVisible: true, isExternal: false },
    { id: 'skills', label: 'Skills', href: '/skills', location: 'about', sortOrder: 20, isVisible: true, isExternal: false },
    { id: 'experience', label: 'Experience', href: '/experience', location: 'about', sortOrder: 30, isVisible: true, isExternal: false },
    { id: 'projects', label: 'Projects', href: '/projects', location: 'about', sortOrder: 40, isVisible: true, isExternal: false },
    { id: 'blog', label: 'Blog', href: '/blog', location: 'about', sortOrder: 50, isVisible: true, isExternal: false },
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 100, isVisible: true, isExternal: false },
];

export async function GET() {
    try {
        const items = await prisma.navigationItem.findMany({
            where: { isVisible: true },
            orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        return NextResponse.json(items.length ? items : fallback);
    } catch {
        return NextResponse.json(fallback);
    }
}

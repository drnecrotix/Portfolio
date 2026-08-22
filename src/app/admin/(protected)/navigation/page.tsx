import { NavigationEditor } from '@/components/admin/NavigationEditor';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NavigationAdminPage() {
    const items = await prisma.navigationItem.findMany({
        orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            label: true,
            href: true,
            parentId: true,
            sortOrder: true,
            isVisible: true,
            isExternal: true,
            isDropdown: true,
            dropdownStyle: true,
        },
    });

    return (
        <div className="mx-auto max-w-6xl">
            <NavigationEditor initialItems={items} />
        </div>
    );
}

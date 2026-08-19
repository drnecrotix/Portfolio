import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const createUserSchema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(200),
    password: z.string().min(12).max(200),
    role: z.enum(['ADMIN', 'EDITOR']),
});

const updateUserSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(200),
    role: z.enum(['ADMIN', 'EDITOR']),
    isActive: z.boolean(),
    password: z.string().max(200).optional(),
});

async function requireOwner() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'OWNER') redirect('/admin');
    return session;
}

async function createUser(formData: FormData) {
    'use server';
    await requireOwner();

    const parsed = createUserSchema.safeParse({
        name: String(formData.get('name') || ''),
        email: String(formData.get('email') || '').toLowerCase(),
        password: String(formData.get('password') || ''),
        role: String(formData.get('role') || 'EDITOR'),
    });
    if (!parsed.success) throw new Error('Invalid user details.');

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) throw new Error('A user with this email already exists.');

    await prisma.user.create({
        data: {
            name: parsed.data.name,
            email: parsed.data.email,
            passwordHash: await hash(parsed.data.password, 12),
            role: parsed.data.role,
            isActive: true,
        },
    });
    revalidatePath('/admin/users');
}

async function updateUser(formData: FormData) {
    'use server';
    const session = await requireOwner();

    const password = String(formData.get('password') || '');
    const parsed = updateUserSchema.safeParse({
        id: String(formData.get('id') || ''),
        name: String(formData.get('name') || ''),
        email: String(formData.get('email') || '').toLowerCase(),
        role: String(formData.get('role') || 'EDITOR'),
        isActive: formData.get('isActive') === 'on',
        password: password || undefined,
    });
    if (!parsed.success) throw new Error('Invalid user details.');

    if (parsed.data.id === session.user.id) {
        throw new Error('The owner account cannot be modified from this screen.');
    }

    const target = await prisma.user.findUnique({ where: { id: parsed.data.id } });
    if (!target || target.role === 'OWNER') {
        throw new Error('Owner accounts are protected.');
    }

    const duplicate = await prisma.user.findFirst({
        where: { email: parsed.data.email, NOT: { id: parsed.data.id } },
        select: { id: true },
    });
    if (duplicate) throw new Error('A user with this email already exists.');

    if (password && password.length < 12) {
        throw new Error('New passwords must contain at least 12 characters.');
    }

    await prisma.user.update({
        where: { id: parsed.data.id },
        data: {
            name: parsed.data.name,
            email: parsed.data.email,
            role: parsed.data.role,
            isActive: parsed.data.isActive,
            ...(password ? { passwordHash: await hash(password, 12) } : {}),
        },
    });
    revalidatePath('/admin/users');
}

export default async function UsersAdminPage() {
    const session = await requireOwner();
    const users = await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] });

    return (
        <div className="max-w-6xl">
            <div className="mb-10">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">Access control</p>
                <h1 className="text-4xl font-semibold">Users & Roles</h1>
                <p className="mt-3 max-w-2xl text-white/50">Create CMS users, assign Admin or Editor access, disable accounts, and rotate passwords. Owner accounts are protected.</p>
            </div>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h2 className="mb-5 text-lg font-semibold">Add user</h2>
                <form action={createUser} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <input name="name" required minLength={2} maxLength={80} placeholder="Name" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                    <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                    <input name="password" type="password" required minLength={12} placeholder="Temporary password" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                    <select name="role" defaultValue="EDITOR" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <button className="rounded-xl bg-white px-5 py-3 font-semibold text-black">Create user</button>
                </form>
            </section>

            <div className="space-y-4">
                {users.map((user) => {
                    const isOwner = user.role === 'OWNER' || user.id === session.user.id;
                    return (
                        <section key={user.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                            {isOwner ? (
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-semibold">{user.name}</h2>
                                            <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">OWNER</span>
                                        </div>
                                        <p className="mt-2 text-sm text-white/45">{user.email}</p>
                                    </div>
                                    <p className="text-xs text-emerald-300/70">Protected owner account</p>
                                </div>
                            ) : (
                                <form action={updateUser} className="grid gap-4 xl:grid-cols-[1fr_1.2fr_160px_140px_1fr_auto] xl:items-end">
                                    <input type="hidden" name="id" value={user.id} />
                                    <label className="block">
                                        <span className="text-xs text-white/40">Name</span>
                                        <input name="name" required minLength={2} maxLength={80} defaultValue={user.name} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-white/40">Email</span>
                                        <input name="email" type="email" required defaultValue={user.email} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-white/40">Role</span>
                                        <select name="role" defaultValue={user.role} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                                            <option value="EDITOR">Editor</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </label>
                                    <label className="flex h-[46px] items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white/65">
                                        <input type="checkbox" name="isActive" defaultChecked={user.isActive} />
                                        Active
                                    </label>
                                    <label className="block">
                                        <span className="text-xs text-white/40">New password (optional)</span>
                                        <input name="password" type="password" minLength={12} placeholder="Leave unchanged" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
                                    </label>
                                    <button className="h-[46px] rounded-xl border border-white/15 px-5 font-semibold text-white hover:bg-white hover:text-black">Save</button>
                                </form>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import { createRedirect, deleteRedirect, updateRedirect } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export const dynamic = 'force-dynamic';

export default async function RedirectsAdminPage() {
    const redirects = await prisma.redirect.findMany({ orderBy: [{ permanent: 'desc' }, { source: 'asc' }] });

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Routing</p>
                <h2 className="mt-2 text-4xl font-semibold">Redirects</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/45">Manage exact-path redirects without editing deployment configuration. Use permanent redirects for moved content and temporary redirects for short-lived routing.</p>
            </div>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="text-lg font-semibold">Add redirect</h3>
                <form action={createRedirect} className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="text-sm text-white/60">Source path<input name="source" required placeholder="/old-page" className={input} /></label>
                    <label className="text-sm text-white/60">Target<input name="target" required placeholder="/new-page or https://example.com" className={input} /></label>
                    <label className="flex items-center gap-3 text-sm text-white/60 md:col-span-2"><input type="checkbox" name="permanent" defaultChecked className="size-4" /> Permanent redirect (308)</label>
                    <div className="md:col-span-2"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Add redirect</button></div>
                </form>
            </section>

            {redirects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-sm text-white/35">No redirects configured.</div>
            ) : (
                <div className="space-y-4">
                    {redirects.map((redirect) => (
                        <article key={redirect.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                            <form action={updateRedirect.bind(null, redirect.id)} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                <label className="text-xs text-white/50">Source<input name="source" defaultValue={redirect.source} className={input} /></label>
                                <label className="text-xs text-white/50">Target<input name="target" defaultValue={redirect.target} className={input} /></label>
                                <div className="flex flex-wrap items-center gap-3 pb-0.5">
                                    <label className="flex items-center gap-2 text-xs text-white/50"><input type="checkbox" name="permanent" defaultChecked={redirect.permanent} /> Permanent</label>
                                    <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">Save</button>
                                </div>
                            </form>
                            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">{redirect.permanent ? '308 permanent' : '307 temporary'}</span>
                                <form action={deleteRedirect.bind(null, redirect.id)}><button className="text-xs text-red-300 hover:text-red-200">Delete</button></form>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

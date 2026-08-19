'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);

        const form = new FormData(event.currentTarget);
        const email = String(form.get('email') || '');
        const password = String(form.get('password') || '');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setLoading(false);
            setError('Invalid email or password.');
            return;
        }

        await fetch('/api/admin/bypass', { method: 'POST' });
        setLoading(false);
        router.push('/admin');
        router.refresh();
    }

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
            <div className="w-full max-w-md border border-white/10 bg-white/[0.03] p-8 rounded-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">Dr Necrotix CMS</p>
                <h1 className="text-3xl font-semibold mb-8">Admin sign in</h1>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="text-sm text-white/60">Email</span>
                        <input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none focus:border-white/30"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm text-white/60">Password</span>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="current-password"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none focus:border-white/30"
                        />
                    </label>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-white text-black px-4 py-3 font-semibold disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </main>
    );
}

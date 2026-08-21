'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function AdminThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = !mounted || resolvedTheme === 'dark';

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.04] text-muted-foreground transition hover:bg-foreground/[0.08] hover:text-foreground"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
}

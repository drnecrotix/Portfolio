'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function AdminThemeToggle() {
    const { setTheme } = useTheme();

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.04] text-muted-foreground transition hover:bg-foreground/[0.08] hover:text-foreground"
            aria-label="Toggle light and dark mode"
            title="Toggle theme"
        >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
        </button>
    );
}

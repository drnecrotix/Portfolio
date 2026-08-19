'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: 'dark' | 'light';
    allowDayMode?: boolean;
}

export function ThemeProvider({ children, defaultTheme = 'dark', allowDayMode = true }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            forcedTheme={allowDayMode ? undefined : 'dark'}
            enableSystem={false}
            disableTransitionOnChange={false}
            storageKey="portfolio-theme"
        >
            {children}
        </NextThemesProvider>
    );
}

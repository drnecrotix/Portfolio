import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display, Alex_Brush } from 'next/font/google';
import { getMessages, getLocale } from 'next-intl/server';
import { ThemeProvider, I18nProvider, SmoothScrollProvider } from '@/providers';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';
import { defaultGeneralSiteSettings, normalizeGeneralSiteSettings } from '@/lib/site-settings';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const signature = Alex_Brush({ weight: '400', subsets: ['latin'], variable: '--font-signature', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
    let seo = defaultSeoDefaults;
    let general = defaultGeneralSiteSettings;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        seo = normalizeSeoDefaults(settings?.seoDefaults);
        general = normalizeGeneralSiteSettings(settings);
    } catch {
        // Keep the public site renderable when the CMS database is temporarily unavailable.
    }

    const ogImages = seo.ogImage ? [{ url: seo.ogImage }] : undefined;
    const twitterImages = seo.twitterImage ? [seo.twitterImage] : seo.ogImage ? [seo.ogImage] : undefined;
    const favicon = general.faviconUrl || defaultGeneralSiteSettings.faviconUrl;

    return {
        title: { default: seo.titleDefault, template: seo.titleTemplate },
        description: seo.description,
        keywords: seo.keywords,
        authors: [{ name: seo.authorName }],
        creator: seo.creatorName,
        metadataBase: new URL(siteUrl),
        openGraph: {
            type: 'website', locale: seo.locale, url: siteUrl, title: seo.ogTitle,
            description: seo.ogDescription, siteName: general.siteName, images: ogImages,
        },
        twitter: {
            card: 'summary_large_image', title: seo.twitterTitle, description: seo.twitterDescription,
            creator: seo.twitterCreator || undefined, images: twitterImages,
        },
        robots: {
            index: seo.indexSite,
            follow: seo.followLinks,
            googleBot: {
                index: seo.indexSite, follow: seo.followLinks, 'max-video-preview': -1,
                'max-image-preview': 'large', 'max-snippet': -1,
            },
        },
        verification: seo.googleVerification ? { google: seo.googleVerification } : undefined,
        icons: {
            icon: [{ url: favicon }],
            shortcut: [{ url: favicon }],
            apple: [{ url: favicon }],
        },
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    ],
    width: 'device-width', initialScale: 1, minimumScale: 1,
};

import { ThemeAwareClickSpark } from '@/components/ui/ThemeAwareClickSpark';
import { ConditionalNavigation } from '@/components/layout/ConditionalNavigation';
import { ArcPreloaderWrapper } from '@/components/layout/ArcPreloaderWrapper';
import { ChatBot } from '@/components/layout/ChatBot';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const messages = await getMessages();
    let general = defaultGeneralSiteSettings;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        general = normalizeGeneralSiteSettings(settings);
    } catch {
        // Theme and public rendering keep safe defaults when CMS storage is unavailable.
    }

    return (
        <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
            <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} ${signature.variable} font-sans relative`}>
                <ThemeProvider defaultTheme={general.defaultTheme} allowDayMode={general.allowDayMode}>
                    <I18nProvider locale={locale} messages={messages}>
                        <SmoothScrollProvider>
                            <ThemeAwareClickSpark>
                                <ArcPreloaderWrapper>
                                    <ConditionalNavigation>{children}</ConditionalNavigation>
                                </ArcPreloaderWrapper>
                                <ChatBot headless />
                            </ThemeAwareClickSpark>
                        </SmoothScrollProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

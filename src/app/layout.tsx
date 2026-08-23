import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display, Alex_Brush } from 'next/font/google';
import { getMessages, getLocale } from 'next-intl/server';
import { ThemeProvider, I18nProvider, SmoothScrollProvider } from '@/providers';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';
import { defaultGeneralSiteSettings, normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { defaultHomepageContent, normalizeHomepageContent, parseCustomMetaTags } from '@/lib/homepage-content';

import '@/styles/globals.css';
import '@/styles/mobile-polish.css';
import '@/styles/footer-alignment.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const signature = Alex_Brush({ weight: '400', subsets: ['latin'], variable: '--font-signature', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
    let seo = defaultSeoDefaults;
    let general = defaultGeneralSiteSettings;
    let homepage = defaultHomepageContent;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        seo = normalizeSeoDefaults(settings?.seoDefaults);
        general = normalizeGeneralSiteSettings(settings);
        homepage = normalizeHomepageContent(settings?.homepageContent);
    } catch {
        // Keep the public site renderable when the CMS database is temporarily unavailable.
    }

    const defaultSocialImage = homepage.socialImage;
    const ogImage = seo.ogImage || defaultSocialImage;
    const twitterImage = seo.twitterImage || defaultSocialImage;
    const ogImages = ogImage ? [{ url: ogImage }] : undefined;
    const twitterImages = twitterImage ? [twitterImage] : undefined;
    const favicon = general.faviconUrl || defaultGeneralSiteSettings.faviconUrl;
    const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
    const alternates: Metadata['alternates'] = {
        ...(seo.canonicalUrl ? { canonical: seo.canonicalUrl } : {}),
        ...(seo.rssEnabled ? { types: { 'application/rss+xml': `${normalizedSiteUrl}/rss.xml` } } : {}),
    };
    const robots = {
        index: seo.indexSite,
        follow: seo.followLinks,
        noarchive: seo.noArchive,
        nosnippet: seo.noSnippet,
        noimageindex: seo.noImageIndex,
        notranslate: seo.noTranslate,
        googleBot: {
            index: seo.indexSite,
            follow: seo.followLinks,
            noarchive: seo.noArchive,
            nosnippet: seo.noSnippet,
            noimageindex: seo.noImageIndex,
            notranslate: seo.noTranslate,
            'max-video-preview': seo.maxVideoPreview,
            'max-image-preview': seo.maxImagePreview,
            'max-snippet': seo.maxSnippet,
        },
    } as Metadata['robots'];

    return {
        title: { default: seo.titleDefault, template: seo.titleTemplate },
        description: seo.description,
        keywords: seo.keywords,
        applicationName: seo.applicationName,
        authors: [{ name: seo.authorName }],
        creator: seo.creatorName,
        publisher: seo.publisherName,
        referrer: seo.referrerPolicy,
        metadataBase: new URL(siteUrl),
        alternates,
        openGraph: { type: 'website', locale: seo.locale, url: seo.canonicalUrl || siteUrl, title: seo.ogTitle, description: seo.ogDescription, siteName: general.siteName, images: ogImages },
        twitter: { card: 'summary_large_image', title: seo.twitterTitle, description: seo.twitterDescription, creator: seo.twitterCreator || undefined, images: twitterImages },
        robots,
        verification: seo.googleVerification ? { google: seo.googleVerification } : undefined,
        icons: { icon: [{ url: favicon }], shortcut: [{ url: favicon }], apple: [{ url: favicon }] },
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
    let homepage = defaultHomepageContent;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        general = normalizeGeneralSiteSettings(settings);
        homepage = normalizeHomepageContent(settings?.homepageContent);
    } catch {
        // Theme and public rendering keep safe defaults when CMS storage is unavailable.
    }

    const customMetaTags = parseCustomMetaTags(homepage.customMetaTags);

    return (
        <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
            <head>
                {customMetaTags.map((tag, index) => {
                    const key = `${tag.attribute}-${tag.key}-${index}`;
                    if (tag.attribute === 'property') return <meta key={key} property={tag.key} content={tag.content} />;
                    if (tag.attribute === 'http-equiv') return <meta key={key} httpEquiv={tag.key} content={tag.content} />;
                    return <meta key={key} name={tag.key} content={tag.content} />;
                })}
            </head>
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

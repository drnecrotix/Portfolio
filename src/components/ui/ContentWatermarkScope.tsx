'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ContentWatermarkSettings } from '@/lib/content-watermark';

type WatermarkMode = 'all' | 'first';

type ContentWatermarkScopeProps = {
    settings: ContentWatermarkSettings;
    children: ReactNode;
    mode?: WatermarkMode;
    protectImages?: boolean;
    ignoreSelector?: string;
};

export function ContentWatermarkScope({
    settings,
    children,
    mode = 'all',
    protectImages = false,
    ignoreSelector,
}: ContentWatermarkScopeProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const label = `© ${settings.text}`;
    const style = {
        '--content-watermark-opacity': String(settings.opacity),
    } as CSSProperties;

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !settings.enabled) return;

        const marked = new Set<HTMLElement>();
        const protectedImages = new Set<HTMLImageElement>();
        const protectedHosts = new Set<HTMLElement>();

        const clearMarked = () => {
            marked.forEach((host) => {
                host.removeAttribute('data-content-watermark-host');
                host.removeAttribute('data-content-watermark-label');
                host.removeAttribute('data-content-watermark-embedded');
            });
            protectedHosts.forEach((host) => host.removeAttribute('data-content-protected-host'));
            protectedImages.forEach((image) => {
                image.removeAttribute('data-content-protected-image');
                image.removeAttribute('draggable');
            });
            marked.clear();
            protectedHosts.clear();
            protectedImages.clear();
        };

        const applyWatermarks = () => {
            clearMarked();
            const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
                .filter((image) => !image.closest('[data-watermark-ignore="true"]'))
                .filter((image) => !ignoreSelector || !image.closest(ignoreSelector));
            const targets = mode === 'first' ? images.slice(0, 1) : images;

            targets.forEach((image) => {
                const host = (image.closest('figure, button') || image.closest('p') || image.parentElement) as HTMLElement | null;
                if (!host || !root.contains(host)) return;

                host.setAttribute('data-content-watermark-host', 'true');
                host.setAttribute('data-content-watermark-label', label);
                const imageUrl = new URL(image.currentSrc || image.src, window.location.origin);
                if (settings.renderMode === 'pixel' && imageUrl.pathname.startsWith('/api/protected-media/')) {
                    host.setAttribute('data-content-watermark-embedded', 'true');
                }
                marked.add(host);

                if (protectImages) {
                    host.setAttribute('data-content-protected-host', 'true');
                    image.setAttribute('data-content-protected-image', 'true');
                    image.setAttribute('draggable', 'false');
                    protectedHosts.add(host);
                    protectedImages.add(image);
                }
            });
        };

        const findProtectedHost = (target: EventTarget | null) => {
            if (!protectImages || !(target instanceof Element)) return null;
            const host = target.closest<HTMLElement>('[data-content-protected-host="true"]');
            return host && root.contains(host) ? host : null;
        };

        const stopProtectedInteraction = (event: Event) => {
            if (!findProtectedHost(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        const stopProtectedKeyboardInteraction = (event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (!findProtectedHost(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        applyWatermarks();
        const observer = new MutationObserver(applyWatermarks);
        observer.observe(root, { childList: true, subtree: true });

        if (protectImages) {
            root.addEventListener('click', stopProtectedInteraction, true);
            root.addEventListener('auxclick', stopProtectedInteraction, true);
            root.addEventListener('contextmenu', stopProtectedInteraction, true);
            root.addEventListener('dragstart', stopProtectedInteraction, true);
            root.addEventListener('keydown', stopProtectedKeyboardInteraction, true);
        }

        return () => {
            observer.disconnect();
            if (protectImages) {
                root.removeEventListener('click', stopProtectedInteraction, true);
                root.removeEventListener('auxclick', stopProtectedInteraction, true);
                root.removeEventListener('contextmenu', stopProtectedInteraction, true);
                root.removeEventListener('dragstart', stopProtectedInteraction, true);
                root.removeEventListener('keydown', stopProtectedKeyboardInteraction, true);
            }
            clearMarked();
        };
    }, [ignoreSelector, label, mode, protectImages, settings.enabled, settings.renderMode]);

    return (
        <div
            ref={rootRef}
            className="contents"
            data-content-watermark-scope={settings.enabled ? 'true' : 'false'}
            data-content-watermark-position={settings.position}
            data-content-watermark-size={settings.size}
            style={style}
        >
            {children}
            <style jsx global>{`
                [data-content-watermark-scope='true'] [data-content-watermark-host='true'] {
                    position: relative !important;
                }

                [data-content-watermark-scope='true'] [data-content-protected-host='true'],
                [data-content-watermark-scope='true'] [data-content-protected-image='true'] {
                    cursor: default !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                }

                [data-content-watermark-scope='true'] [data-content-protected-image='true'] {
                    -webkit-user-drag: none !important;
                }

                [data-content-watermark-scope='true'] [data-content-watermark-host='true']::after {
                    content: attr(data-content-watermark-label);
                    position: absolute;
                    z-index: 25;
                    max-width: 68%;
                    overflow: hidden;
                    border-radius: 0.375rem;
                    background: rgba(0, 0, 0, 0.34);
                    padding: 0.25rem 0.5rem;
                    color: white;
                    font-size: 10px;
                    font-weight: 500;
                    line-height: 1.2;
                    letter-spacing: 0.08em;
                    opacity: var(--content-watermark-opacity, 0.35);
                    pointer-events: none;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                }

                [data-content-watermark-scope='true'] [data-content-watermark-host='true'][data-content-watermark-embedded='true']::after {
                    content: none;
                    display: none;
                }

                [data-content-watermark-scope='true'][data-content-watermark-size='medium'] [data-content-watermark-host='true']::after {
                    padding: 0.32rem 0.62rem;
                    font-size: 12px;
                }

                [data-content-watermark-scope='true'][data-content-watermark-position='top-left'] [data-content-watermark-host='true']::after {
                    left: 0.75rem;
                    top: 0.75rem;
                }

                [data-content-watermark-scope='true'][data-content-watermark-position='top-right'] [data-content-watermark-host='true']::after {
                    right: 0.75rem;
                    top: 0.75rem;
                }

                [data-content-watermark-scope='true'][data-content-watermark-position='bottom-left'] [data-content-watermark-host='true']::after {
                    bottom: 0.75rem;
                    left: 0.75rem;
                }

                [data-content-watermark-scope='true'][data-content-watermark-position='bottom-right'] [data-content-watermark-host='true']::after {
                    bottom: 0.75rem;
                    right: 0.75rem;
                }

                @media (max-width: 640px) {
                    [data-content-watermark-scope='true'] [data-content-watermark-host='true']::after {
                        max-width: 72%;
                        padding: 0.22rem 0.42rem;
                        font-size: 9px;
                    }

                    [data-content-watermark-scope='true'][data-content-watermark-position='top-left'] [data-content-watermark-host='true']::after,
                    [data-content-watermark-scope='true'][data-content-watermark-position='bottom-left'] [data-content-watermark-host='true']::after {
                        left: 0.55rem;
                    }

                    [data-content-watermark-scope='true'][data-content-watermark-position='top-right'] [data-content-watermark-host='true']::after,
                    [data-content-watermark-scope='true'][data-content-watermark-position='bottom-right'] [data-content-watermark-host='true']::after {
                        right: 0.55rem;
                    }

                    [data-content-watermark-scope='true'][data-content-watermark-position='top-left'] [data-content-watermark-host='true']::after,
                    [data-content-watermark-scope='true'][data-content-watermark-position='top-right'] [data-content-watermark-host='true']::after {
                        top: 0.55rem;
                    }

                    [data-content-watermark-scope='true'][data-content-watermark-position='bottom-left'] [data-content-watermark-host='true']::after,
                    [data-content-watermark-scope='true'][data-content-watermark-position='bottom-right'] [data-content-watermark-host='true']::after {
                        bottom: 0.55rem;
                    }
                }
            `}</style>
        </div>
    );
}

'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ContentWatermarkSettings } from '@/lib/content-watermark';

export function ContentWatermarkScope({ settings, children }: { settings: ContentWatermarkSettings; children: ReactNode }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const label = `© ${settings.text}`;
    const style = {
        '--content-watermark-opacity': String(settings.opacity),
    } as CSSProperties;

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !settings.enabled) return;

        const marked = new Set<HTMLElement>();
        const applyWatermarks = () => {
            root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
                if (image.closest('[data-watermark-ignore="true"]')) return;

                const host = (image.closest('figure, button') || image.closest('p') || image.parentElement) as HTMLElement | null;
                if (!host || !root.contains(host)) return;

                host.setAttribute('data-content-watermark-host', 'true');
                host.setAttribute('data-content-watermark-label', label);
                marked.add(host);
            });
        };

        applyWatermarks();
        const observer = new MutationObserver(applyWatermarks);
        observer.observe(root, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            marked.forEach((host) => {
                host.removeAttribute('data-content-watermark-host');
                host.removeAttribute('data-content-watermark-label');
            });
        };
    }, [label, settings.enabled]);

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

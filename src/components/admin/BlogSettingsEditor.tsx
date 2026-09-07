'use client';

import { useState } from 'react';
import { BlogHeroTitle } from '@/components/blog/BlogHeroTitle';
import type { BlogSettings, BlogTitleEffect } from '@/lib/blog-settings';
import { updateBlogSettings } from '@/app/admin/(protected)/blog/settings/actions';

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30';

export function BlogSettingsEditor({ initialSettings }: { initialSettings: BlogSettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const set = <K extends keyof BlogSettings,>(key: K, value: BlogSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    const words = Array.from({ length: 8 }, (_, index) => settings.rotatingWords[index] ?? '');

    return (
        <form action={updateBlogSettings} className="space-y-8">
            <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6">
                <div className="mb-5">
                    <h3 className="text-lg font-semibold">Live preview</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Preview of the Blog hero text. Archive filters and publication list are not changed here.</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background p-5 sm:p-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-500 dark:text-fuchsia-300">{settings.eyebrow}</p>
                    <BlogHeroTitle settings={settings} className="mt-4 text-3xl leading-[1.03] sm:text-5xl" />
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{settings.subtitle}</p>
                </div>
            </section>

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6 md:grid-cols-2">
                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold">Journal heading</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Edit the public Blog eyebrow, title and subtitle without touching publication content.</p>
                </div>
                <label className="text-sm text-muted-foreground">Eyebrow
                    <input name="eyebrow" value={settings.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} className={input} />
                </label>
                <label className="text-sm text-muted-foreground">Title effect
                    <select name="titleEffect" value={settings.titleEffect} onChange={(event) => set('titleEffect', event.target.value as BlogTitleEffect)} className={input}>
                        <option value="none">None</option>
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="gradient">Gradient</option>
                        <option value="glitch">Glitch</option>
                    </select>
                </label>
                <label className="text-sm text-muted-foreground md:col-span-2">Static title
                    <input name="title" value={settings.title} onChange={(event) => set('title', event.target.value)} className={input} />
                </label>
                <label className="text-sm text-muted-foreground md:col-span-2">Subtitle
                    <textarea name="subtitle" value={settings.subtitle} onChange={(event) => set('subtitle', event.target.value)} rows={3} className={input} />
                </label>
            </section>

            <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Rotating words / phrases</h3>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Enable this to keep a fixed prefix and suffix while cycling individual words or short phrases, similar to the compact footer text animation.</p>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                        <input name="rotatingEnabled" type="checkbox" checked={settings.rotatingEnabled} onChange={(event) => set('rotatingEnabled', event.target.checked)} className="size-4 rounded border-foreground/20" />
                        Enabled
                    </label>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_180px]">
                    <label className="text-sm text-muted-foreground">Prefix
                        <input name="titlePrefix" value={settings.titlePrefix} onChange={(event) => set('titlePrefix', event.target.value)} className={input} />
                    </label>
                    <label className="text-sm text-muted-foreground">Suffix
                        <input name="titleSuffix" value={settings.titleSuffix} onChange={(event) => set('titleSuffix', event.target.value)} className={input} />
                    </label>
                    <label className="text-sm text-muted-foreground">Interval (ms)
                        <input name="rotationIntervalMs" type="number" min={1200} max={10000} step={100} value={settings.rotationIntervalMs} onChange={(event) => set('rotationIntervalMs', Number(event.target.value) || 2600)} className={input} />
                    </label>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {words.map((word, index) => (
                        <label key={index} className="text-sm text-muted-foreground">Phrase {index + 1}
                            <input
                                name={`rotatingWord${index}`}
                                value={word}
                                onChange={(event) => {
                                    const next = [...words];
                                    next[index] = event.target.value;
                                    set('rotatingWords', next);
                                }}
                                placeholder={index < 3 ? ['notes & field logs', 'poetry & field logs', 'thoughts & field logs'][index] : 'Optional'}
                                className={input}
                            />
                        </label>
                    ))}
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background">Save Blog appearance</button>
                <a href="/blog" target="_blank" rel="noreferrer" className="rounded-xl border border-foreground/10 px-5 py-3 text-sm text-muted-foreground transition hover:text-foreground">Open Blog</a>
            </div>
        </form>
    );
}

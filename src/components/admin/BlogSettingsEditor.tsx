'use client';

import { useState } from 'react';
import { ExternalLink, RefreshCw, SlidersHorizontal, Type } from 'lucide-react';
import { BlogHeroTitle } from '@/components/blog/BlogHeroTitle';
import type { BlogSettings, BlogTitleEffect } from '@/lib/blog-settings';
import { updateBlogSettings } from '@/app/admin/(protected)/blog/settings/actions';

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground/30';
type SectionId = 'heading' | 'rotation';

export function BlogSettingsEditor({ initialSettings }: { initialSettings: BlogSettings }) {
    const [settings, setSettings] = useState(initialSettings);
    const [active, setActive] = useState<SectionId>('heading');
    const set = <K extends keyof BlogSettings,>(key: K, value: BlogSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
    const words = Array.from({ length: 8 }, (_, index) => settings.rotatingWords[index] ?? '');

    return (
        <form action={updateBlogSettings}>
            <input type="hidden" name="eyebrow" value={settings.eyebrow} />
            <input type="hidden" name="title" value={settings.title} />
            <input type="hidden" name="subtitle" value={settings.subtitle} />
            <input type="hidden" name="titleEffect" value={settings.titleEffect} />
            {settings.rotatingEnabled ? <input type="hidden" name="rotatingEnabled" value="on" /> : null}
            <input type="hidden" name="titlePrefix" value={settings.titlePrefix} />
            <input type="hidden" name="titleSuffix" value={settings.titleSuffix} />
            <input type="hidden" name="rotationIntervalMs" value={settings.rotationIntervalMs} />
            {words.map((word, index) => <input key={index} type="hidden" name={`rotatingWord${index}`} value={word} />)}

            <div className="grid min-w-0 gap-5 xl:grid-cols-[180px_minmax(0,1fr)_390px]">
                <nav className="xl:sticky xl:top-5 xl:self-start" aria-label="Blog appearance sections">
                    <div className="flex gap-1 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
                        {[
                            { id: 'heading' as const, label: 'Heading', hint: 'Text and title effect', icon: Type },
                            { id: 'rotation' as const, label: 'Rotation', hint: 'Dynamic words and timing', icon: RefreshCw },
                        ].map((item) => {
                            const Icon = item.icon;
                            const selected = active === item.id;
                            return (
                                <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`flex min-w-[155px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition xl:w-full xl:min-w-0 ${selected ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'}`}>
                                    <span className={`grid size-8 place-items-center rounded-lg border ${selected ? 'border-background/10 bg-background/[0.05]' : 'border-foreground/10'}`}><Icon className="size-4" /></span>
                                    <span className="min-w-0"><span className="block truncate text-xs font-semibold">{item.label}</span><span className={`mt-0.5 hidden truncate text-[10px] xl:block ${selected ? 'opacity-55' : 'opacity-45'}`}>{item.hint}</span></span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="min-w-0 rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-5 sm:p-6">
                    {active === 'heading' ? (
                        <section>
                            <div className="mb-6">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"><SlidersHorizontal className="size-3.5" /> Journal heading</div>
                                <h3 className="mt-2 text-xl font-semibold">Hero text</h3>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Edit the public Blog eyebrow, title, subtitle and title animation. The preview updates immediately.</p>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <label className="text-xs text-muted-foreground">Eyebrow
                                    <input value={settings.eyebrow} onChange={(event) => set('eyebrow', event.target.value)} className={input} />
                                </label>
                                <label className="text-xs text-muted-foreground">Title effect
                                    <select value={settings.titleEffect} onChange={(event) => set('titleEffect', event.target.value as BlogTitleEffect)} className={input}>
                                        <option value="none">None</option>
                                        <option value="fade">Fade</option>
                                        <option value="slide">Slide</option>
                                        <option value="gradient">Gradient</option>
                                        <option value="glitch">Glitch</option>
                                    </select>
                                </label>
                                <label className="text-xs text-muted-foreground md:col-span-2">Static title
                                    <input value={settings.title} onChange={(event) => set('title', event.target.value)} className={input} />
                                </label>
                                <label className="text-xs text-muted-foreground md:col-span-2">Subtitle
                                    <textarea value={settings.subtitle} onChange={(event) => set('subtitle', event.target.value)} rows={4} className={input} />
                                </label>
                            </div>
                        </section>
                    ) : (
                        <section>
                            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground"><RefreshCw className="size-3.5" /> Dynamic title</div>
                                    <h3 className="mt-2 text-xl font-semibold">Rotating words / phrases</h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Use a fixed prefix and suffix while cycling short phrases in the main Journal title.</p>
                                </div>
                                <label className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs text-muted-foreground">
                                    <input type="checkbox" checked={settings.rotatingEnabled} onChange={(event) => set('rotatingEnabled', event.target.checked)} className="size-4" /> Enabled
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
                                <label className="text-xs text-muted-foreground">Prefix<input value={settings.titlePrefix} onChange={(event) => set('titlePrefix', event.target.value)} className={input} /></label>
                                <label className="text-xs text-muted-foreground">Suffix<input value={settings.titleSuffix} onChange={(event) => set('titleSuffix', event.target.value)} className={input} /></label>
                                <label className="text-xs text-muted-foreground">Interval (ms)<input type="number" min={1200} max={10000} step={100} value={settings.rotationIntervalMs} onChange={(event) => set('rotationIntervalMs', Number(event.target.value) || 2600)} className={input} /></label>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                {words.map((word, index) => (
                                    <label key={index} className="text-xs text-muted-foreground">Phrase {index + 1}
                                        <input
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
                    )}

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4">
                        <span className="text-[10px] text-muted-foreground">Preview is local until you save.</span>
                        <div className="flex gap-2">
                            <a href="/blog" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-4 py-2.5 text-xs text-muted-foreground transition hover:text-foreground">Open Blog <ExternalLink className="size-3.5" /></a>
                            <button className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background">Save appearance</button>
                        </div>
                    </div>
                </div>

                <aside className="xl:sticky xl:top-5 xl:self-start">
                    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_24px_80px_-48px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
                            <div><p className="font-mono text-[8px] uppercase tracking-[0.26em] text-muted-foreground">Live preview</p><p className="mt-1 text-xs font-semibold">Blog hero</p></div>
                            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.055] px-2 py-1 text-[9px] text-emerald-500"><span className="size-1.5 rounded-full bg-emerald-400" /> Live</span>
                        </div>
                        <div className="p-5 sm:p-6">
                            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-fuchsia-500 dark:text-fuchsia-300">{settings.eyebrow}</p>
                            <BlogHeroTitle settings={settings} className="mt-4 text-3xl leading-[1.02] sm:text-4xl" />
                            <p className="mt-5 text-sm leading-7 text-muted-foreground">{settings.subtitle}</p>
                            <div className="mt-6 border-t border-foreground/10 pt-3 text-[9px] text-muted-foreground">{settings.rotatingEnabled ? `Rotation on · ${settings.rotationIntervalMs} ms` : `Static title · ${settings.titleEffect}`}</div>
                        </div>
                    </div>
                </aside>
            </div>
        </form>
    );
}

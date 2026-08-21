'use client';

import { useMemo, useState } from 'react';

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none transition focus:border-white/30 focus:bg-white/[0.05]';

type SeoState = 'good' | 'medium' | 'poor';

function scoreSeo(title: string, description: string, slug: string, hasImage: boolean) {
  let score = 0;
  const notes: string[] = [];
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  const cleanSlug = slug.trim();

  if (cleanTitle) score += 20; else notes.push('Add an SEO title.');
  if (cleanTitle.length >= 30 && cleanTitle.length <= 65) score += 20; else if (cleanTitle) notes.push('Keep the title concise and descriptive (roughly 30–65 characters is a practical editor target).');
  if (cleanDescription) score += 20; else notes.push('Add an SEO description.');
  if (cleanDescription.length >= 70 && cleanDescription.length <= 170) score += 20; else if (cleanDescription) notes.push('Use a useful page summary; snippets may be truncated or rewritten by search engines.');
  if (cleanSlug && cleanSlug.length <= 80) score += 10; else notes.push('Use a short, readable slug.');
  if (hasImage) score += 10; else notes.push('Add a featured/share image for richer previews.');

  const state: SeoState = score >= 80 ? 'good' : score >= 50 ? 'medium' : 'poor';
  return { score, state, notes };
}

export function SeoEditor({
  sourceTitle,
  sourceDescription,
  slug,
  hasImage,
  initialTitle = '',
  initialDescription = '',
}: {
  sourceTitle: string;
  sourceDescription: string;
  slug: string;
  hasImage: boolean;
  initialTitle?: string | null;
  initialDescription?: string | null;
}) {
  const [customTitle, setCustomTitle] = useState(initialTitle ?? '');
  const [customDescription, setCustomDescription] = useState(initialDescription ?? '');
  const [titleTouched, setTitleTouched] = useState(Boolean(initialTitle));
  const [descriptionTouched, setDescriptionTouched] = useState(Boolean(initialDescription));

  const seoTitle = titleTouched ? customTitle : (customTitle || sourceTitle);
  const seoDescription = descriptionTouched ? customDescription : (customDescription || sourceDescription);
  const health = useMemo(() => scoreSeo(seoTitle, seoDescription, slug, hasImage), [seoTitle, seoDescription, slug, hasImage]);

  const tone = health.state === 'good'
    ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200'
    : health.state === 'medium'
      ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200'
      : 'border-red-400/20 bg-red-400/[0.06] text-red-200';

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">SEO</h3>
          <p className="mt-1 text-xs text-white/35">Empty SEO fields follow the post/project title and summary automatically until you edit them.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone}`}>
          {health.state} · {health.score}/100
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-xs text-white/45">
          SEO title
          <input
            name="seoTitle"
            value={seoTitle}
            onChange={(event) => { setTitleTouched(true); setCustomTitle(event.target.value); }}
            className={inputClass}
          />
          <span className="mt-1 block text-[10px] text-white/25">{seoTitle.length} characters</span>
        </label>
        <label className="block text-xs text-white/45">
          SEO description
          <textarea
            name="seoDescription"
            rows={4}
            value={seoDescription}
            onChange={(event) => { setDescriptionTouched(true); setCustomDescription(event.target.value); }}
            className={inputClass}
          />
          <span className="mt-1 block text-[10px] text-white/25">{seoDescription.length} characters</span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-medium text-white/55">Search preview</p>
        <p className="mt-2 truncate text-base font-medium text-sky-300">{seoTitle || 'Untitled page'}</p>
        <p className="mt-1 truncate text-xs text-emerald-300/70">/{slug || 'page-slug'}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{seoDescription || 'Add a useful description of this page.'}</p>
      </div>

      {health.notes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {health.notes.slice(0, 3).map((note) => <span key={note} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/40">{note}</span>)}
        </div>
      )}
      <p className="mt-3 text-[10px] leading-4 text-white/25">This is an editorial health check, not a Google ranking score. Search engines can rewrite title links and snippets based on the query and page content.</p>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Heart, Share2 } from 'lucide-react';

function compactCount(value: number) {
  const count = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (count < 1_000) return String(count);
  if (count < 1_000_000) return `${(count / 1_000).toFixed(count < 100_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(count / 1_000_000).toFixed(count < 100_000_000 ? 1 : 0).replace(/\.0$/, '')}M`;
}

export function GalleryWorkEngagement({
  slug,
  title,
  description,
  initialLikeCount,
  initialViewCount,
  initiallyLiked,
}: {
  slug: string;
  title: string;
  description: string;
  initialLikeCount: number;
  initialViewCount: number;
  initiallyLiked: boolean;
}) {
  const viewRecorded = useRef(false);
  const [liked, setLiked] = useState(initiallyLiked);
  const [likes, setLikes] = useState(initialLikeCount);
  const [views, setViews] = useState(initialViewCount);
  const [liking, setLiking] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    const storageKey = `necrotix:gallery-view:${slug}`;
    try {
      if (sessionStorage.getItem(storageKey) === '1') return;
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // Storage can be restricted in embedded browsers. The endpoint still works.
    }

    void fetch('/api/gallery/engagement', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, action: 'view' }),
    })
      .then(async (response) => {
        const data = await response.json() as { views?: number; likes?: number };
        if (!response.ok) throw new Error('Unable to record view.');
        setViews(Number(data.views) || 0);
        if (typeof data.likes === 'number') setLikes(data.likes);
      })
      .catch(() => {
        try { sessionStorage.removeItem(storageKey); } catch { /* optional storage */ }
        viewRecorded.current = false;
      });
  }, [slug]);

  const toggleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const response = await fetch('/api/gallery/engagement', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'like' }),
      });
      const data = await response.json() as { liked?: boolean; likes?: number; views?: number; error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to update like.');
      setLiked(Boolean(data.liked));
      setLikes(Number(data.likes) || 0);
      if (typeof data.views === 'number') setViews(data.views);
    } finally {
      setLiking(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: description || title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      // Native share cancellation is not an error state for the page.
    }
  };

  const base = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition';

  return (
    <div className="mx-auto mt-4 flex w-full max-w-[1180px] flex-wrap items-center justify-end gap-2 border-y border-foreground/10 py-3">
      <button
        type="button"
        onClick={() => void toggleLike()}
        disabled={liking}
        aria-pressed={liked}
        className={`${base} ${liked ? 'border-rose-500/25 bg-rose-500/10 text-rose-500' : 'border-foreground/10 bg-foreground/[0.025] text-muted-foreground hover:text-foreground'}`}
      >
        <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        <span>{compactCount(likes)}</span>
      </button>
      <div className={`${base} border-foreground/10 bg-foreground/[0.025] text-muted-foreground`} title={`${views.toLocaleString()} views`}>
        <Eye className="h-4 w-4" />
        <span>{compactCount(views)}</span>
      </div>
      <button type="button" onClick={() => void share()} className={`${base} border-foreground/10 bg-foreground/[0.025] text-muted-foreground hover:text-foreground`}>
        {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        <span>{shared ? 'Shared' : 'Share'}</span>
      </button>
    </div>
  );
}

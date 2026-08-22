'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function UnsavedContentPreview({ kind }: { kind: 'blog' | 'project' }) {
  const [html, setHtml] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!html) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHtml(null);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [html]);

  const openPreview = (button: HTMLButtonElement) => {
    const form = button.form;
    if (!form) return;
    const data = new FormData(form);
    const title = String(data.get('title') || 'Untitled');
    const description = String(data.get(kind === 'blog' ? 'excerpt' : 'description') || '');
    const image = String(data.get(kind === 'blog' ? 'featuredImage' : 'imageUrl') || '');
    const content = String(data.get(kind === 'blog' ? 'content' : 'longDescription') || '');
    const fallbackText = stripHtml(content).slice(0, 1200);

    setHtml(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      :root{color-scheme:dark}body{margin:0;background:#0b0b0d;color:#f5f5f5;font-family:Inter,Arial,sans-serif}.wrap{max-width:900px;margin:0 auto;padding:48px 28px 80px}.eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#777;margin-bottom:16px}.title{font-size:clamp(38px,7vw,76px);line-height:1.02;margin:0 0 20px;font-weight:850;letter-spacing:-.04em}.desc{max-width:720px;color:#a9a9ad;font-size:18px;line-height:1.7;margin-bottom:34px}.image{width:100%;max-height:520px;object-fit:cover;border-radius:24px;border:1px solid #242428;margin:0 0 36px}.content{font-size:17px;line-height:1.8;color:#ddd}.content img{max-width:100%;height:auto;border-radius:16px}.content a{color:#7dd3fc}.note{margin-top:40px;padding:14px 16px;border:1px solid #2b2b30;border-radius:14px;color:#777;font-size:12px}
    </style></head><body><main class="wrap"><div class="eyebrow">Unsaved ${kind === 'blog' ? 'blog post' : 'project'} preview</div><h1 class="title">${esc(title)}</h1>${description ? `<p class="desc">${esc(description)}</p>` : ''}${image ? `<img class="image" src="${esc(image)}" alt="">` : ''}<article class="content">${content || `<p>${esc(fallbackText)}</p>`}</article><div class="note">Preview uses the current form values and does not save or publish anything.</div></main></body></html>`);
  };

  const modal = html && mounted ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="Unsaved content preview">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div><p className="text-sm font-semibold">Unsaved preview</p><p className="text-[11px] text-white/35">Current editor values - nothing is saved</p></div>
          <button type="button" onClick={() => setHtml(null)} className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white" aria-label="Close preview"><X className="h-4 w-4" /></button>
        </div>
        <iframe title="Unsaved content preview" sandbox="" srcDoc={html} className="min-h-0 flex-1 bg-[#0b0b0d]" />
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button type="button" onClick={(event) => openPreview(event.currentTarget)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/65 transition hover:bg-white/[0.05] hover:text-white">
        <Eye className="h-4 w-4" /> Preview
      </button>
      {modal}
    </>
  );
}

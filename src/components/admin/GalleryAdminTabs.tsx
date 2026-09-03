'use client';

import { useState, type ReactNode } from 'react';
import { Eye, Image as ImageIcon, SlidersHorizontal, Type } from 'lucide-react';

const tabs = [
  { id: 'works', label: 'Works', icon: ImageIcon },
  { id: 'published', label: 'Published', icon: Eye },
  { id: 'page', label: 'Page', icon: Type },
  { id: 'interface', label: 'Interface', icon: SlidersHorizontal },
] as const;

export type GalleryAdminTabId = typeof tabs[number]['id'];

export function GalleryAdminTabs({ works, published, page, interfacePanel, initialTab = 'works' }: { works: ReactNode; published: ReactNode; page: ReactNode; interfacePanel: ReactNode; initialTab?: GalleryAdminTabId }) {
  const [active, setActive] = useState<GalleryAdminTabId>(initialTab);
  const panels: Record<GalleryAdminTabId, ReactNode> = { works, published, page, interface: interfacePanel };

  return (
    <div>
      <input type="hidden" name="adminTab" value={active} readOnly />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-1.5 scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            aria-selected={active === id}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${active === id ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground'}`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      {tabs.map(({ id }) => (
        <div key={id} hidden={active !== id} aria-hidden={active !== id}>
          {panels[id]}
        </div>
      ))}
    </div>
  );
}

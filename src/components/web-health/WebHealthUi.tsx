'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { HealthCheck, HealthStatus } from '@/modules/web-health/types';

const tools = [
    ['Website Inspector', '/website-inspector', 'website'],
    ['Email Domain Security', '/email-domain-security', 'email'],
    ['Site Crawl', '/site-crawl', 'crawl'],
    ['Accessibility Check', '/accessibility-check', 'accessibility'],
    ['SEO Intelligence', '/seo-intelligence', 'seo'],
] as const;

function statusText(status: HealthStatus) {
    if (status === 'pass') return 'text-emerald-600 dark:text-emerald-400';
    if (status === 'fail') return 'text-rose-600 dark:text-rose-400';
    if (status === 'warning') return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
}

function statusMark(status: HealthStatus) {
    if (status === 'pass') return 'PASS';
    if (status === 'fail') return 'FAIL';
    if (status === 'warning') return 'WARN';
    return 'INFO';
}

export function WebHealthNav({ active }: { active: 'website' | 'email' | 'crawl' | 'accessibility' | 'seo' }) {
    return (
        <nav aria-label="Web Health Suite" className="mt-8 flex flex-wrap border-y border-border/80 font-mono text-[9px] font-bold uppercase tracking-[0.13em]">
            {tools.map(([label, href, id]) => (
                <Link key={id} href={href} className={`border-r border-border/70 px-3 py-3 transition sm:px-4 ${id === active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                    {label}
                </Link>
            ))}
        </nav>
    );
}

export function HealthCheckRows({ checks }: { checks: HealthCheck[] }) {
    return (
        <div className="border-y border-border/80">
            {checks.map((check, index) => (
                <div key={check.id} className={`grid gap-2 py-4 sm:grid-cols-[64px_minmax(160px,220px)_minmax(0,1fr)] sm:gap-4 ${index ? 'border-t border-border/60' : ''}`}>
                    <span className={`font-mono text-[9px] font-black tracking-[0.12em] ${statusText(check.status)}`}>{statusMark(check.status)}</span>
                    <p className="text-sm font-semibold">{check.label}</p>
                    <div className="min-w-0">
                        <p className="text-xs leading-5 text-muted-foreground">{check.summary}</p>
                        {check.recommendation ? <p className="mt-1.5 text-xs leading-5 text-foreground/80"><span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-sky-500">Fix</span>{check.recommendation}</p> : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ScoreLine({ score, right }: { score: number; right?: ReactNode }) {
    return (
        <div className="mt-8 flex flex-col gap-4 border-t border-border/80 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Health score</p><div className="mt-1 flex items-baseline gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{score}</span><span className="font-mono text-xs font-bold text-muted-foreground">/100</span></div></div>
            {right ? <div className="text-xs text-muted-foreground">{right}</div> : null}
        </div>
    );
}

import 'server-only';

import { getRuntimeIntegrationValue } from '@/lib/integration-runtime';
import { finiteNumber, normalizeSeoTarget, SEO_LANGUAGE_CODE_BG, SEO_LOCATION_CODE_BG, targetMatchesDomain, type SeoIntelligenceMode } from '@/modules/seo-intelligence/core';

const BASE_URL = 'https://api.dataforseo.com';

export class DataForSeoError extends Error {
    status: number;

    constructor(message: string, status = 502) {
        super(message);
        this.name = 'DataForSeoError';
        this.status = status;
    }
}

async function credentials() {
    const [login, password] = await Promise.all([
        getRuntimeIntegrationValue('dataforseo.login', 'DATAFORSEO_LOGIN'),
        getRuntimeIntegrationValue('dataforseo.password', 'DATAFORSEO_PASSWORD'),
    ]);
    if (!login || !password) throw new DataForSeoError('SEO Intelligence is not configured yet.', 503);
    return { login, password };
}

async function post(path: string, task: Record<string, unknown>) {
    const { login, password } = await credentials();
    const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([task]),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new DataForSeoError(`DataForSEO returned HTTP ${response.status}.`, response.status === 401 ? 502 : response.status);
    const payload = await response.json().catch(() => null) as any;
    if (!payload || Number(payload.status_code) !== 20000) {
        throw new DataForSeoError(String(payload?.status_message || 'DataForSEO request failed.'));
    }
    const taskResult = payload.tasks?.[0];
    if (!taskResult || Number(taskResult.status_code) !== 20000) {
        throw new DataForSeoError(String(taskResult?.status_message || 'DataForSEO task failed.'));
    }

    return {
        result: Array.isArray(taskResult.result) ? taskResult.result : [],
        costUsd: finiteNumber(taskResult.cost ?? payload.cost),
    };
}

function keywordRows(result: any[]) {
    const items = Array.isArray(result?.[0]?.items) ? result[0].items : [];
    return items.slice(0, 20).map((item: any) => ({
        keyword: String(item?.keyword || ''),
        searchVolume: finiteNumber(item?.keyword_info?.search_volume),
        cpc: finiteNumber(item?.keyword_info?.cpc),
        competition: finiteNumber(item?.keyword_info?.competition),
        competitionLevel: String(item?.keyword_info?.competition_level || ''),
    })).filter((item: any) => item.keyword);
}

function serpRows(result: any[], target = '') {
    const items = Array.isArray(result?.[0]?.items) ? result[0].items : [];
    return items
        .filter((item: any) => item?.type === 'organic')
        .slice(0, 20)
        .map((item: any) => ({
            rank: finiteNumber(item?.rank_absolute || item?.rank_group),
            title: String(item?.title || ''),
            domain: String(item?.domain || ''),
            url: String(item?.url || ''),
            isTarget: targetMatchesDomain(target, String(item?.domain || '')),
        }));
}

function competitorRows(result: any[]) {
    const items = Array.isArray(result?.[0]?.items) ? result[0].items : [];
    return items.slice(0, 12).map((item: any) => ({
        domain: String(item?.domain || ''),
        intersections: finiteNumber(item?.intersections),
        avgPosition: finiteNumber(item?.avg_position),
        etv: finiteNumber(item?.full_domain_metrics?.organic?.etv ?? item?.etv),
        keywords: finiteNumber(item?.full_domain_metrics?.organic?.count ?? item?.keywords_count),
    })).filter((item: any) => item.domain);
}

function backlinkSummary(result: any[]) {
    const item = result?.[0] || {};
    return {
        target: String(item?.target || ''),
        rank: finiteNumber(item?.rank),
        backlinks: finiteNumber(item?.backlinks),
        referringDomains: finiteNumber(item?.referring_domains),
        referringPages: finiteNumber(item?.referring_pages),
        brokenBacklinks: finiteNumber(item?.broken_backlinks),
    };
}

export async function runSeoIntelligence(input: { mode: SeoIntelligenceMode; query: string; target?: string }) {
    const location_code = SEO_LOCATION_CODE_BG;
    const language_code = SEO_LANGUAGE_CODE_BG;

    if (input.mode === 'keywords') {
        const response = await post('/v3/dataforseo_labs/google/keyword_suggestions/live', {
            keyword: input.query,
            location_code,
            language_code,
            include_seed_keyword: true,
            limit: 20,
        });
        return { mode: input.mode, rows: keywordRows(response.result), costUsd: response.costUsd };
    }

    if (input.mode === 'serp') {
        const response = await post('/v3/serp/google/organic/live/advanced', {
            keyword: input.query,
            location_code,
            language_code,
            device: 'desktop',
            os: 'windows',
            depth: 20,
        });
        return { mode: input.mode, rows: serpRows(response.result, input.target), costUsd: response.costUsd };
    }

    const target = normalizeSeoTarget(input.query);
    if (!target || !target.includes('.')) throw new DataForSeoError('Enter a valid domain.', 400);

    if (input.mode === 'competitors') {
        const response = await post('/v3/dataforseo_labs/google/competitors_domain/live', {
            target,
            location_code,
            language_code,
            exclude_top_domains: true,
            limit: 12,
        });
        return { mode: input.mode, rows: competitorRows(response.result), costUsd: response.costUsd };
    }

    const response = await post('/v3/backlinks/summary/live', {
        target,
        include_subdomains: true,
        exclude_internal_backlinks: true,
    });
    return { mode: input.mode, summary: backlinkSummary(response.result), costUsd: response.costUsd };
}

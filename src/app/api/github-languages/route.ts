import { NextResponse } from 'next/server';
import { getRuntimeIntegrationValue } from '@/lib/integration-runtime';

const cacheHeaders = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300' };

export async function GET() {
  const githubToken = await getRuntimeIntegrationValue('github.apiKey', 'GITHUB_TOKEN');
  if (!githubToken) {
    return NextResponse.json({ error: 'GitHub metrics are unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const query = `
    query {
      viewer {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name color } }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('[GitHub languages] Upstream request failed with status', res.status);
      return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const json = await res.json();
    const repos = json?.data?.viewer?.repositories?.nodes;
    if (!Array.isArray(repos) || Array.isArray(json?.errors)) {
      console.warn('[GitHub languages] Unexpected upstream response');
      return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const languageStats: Record<string, { size: number; color: string }> = {};
    let totalSize = 0;

    for (const repo of repos) {
      const edges = repo?.languages?.edges;
      if (!Array.isArray(edges)) continue;
      for (const edge of edges) {
        const size = Number(edge?.size ?? 0);
        const name = String(edge?.node?.name ?? '').trim();
        const color = String(edge?.node?.color ?? '#888888');
        if (!name || !Number.isFinite(size) || size <= 0) continue;
        if (!languageStats[name]) languageStats[name] = { size: 0, color };
        languageStats[name].size += size;
        totalSize += size;
      }
    }

    const languages = Object.entries(languageStats)
      .map(([name, { size, color }]) => ({ name, size, color, percent: totalSize > 0 ? Math.round((size / totalSize) * 10000) / 100 : 0 }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 6);

    return NextResponse.json({ data: languages }, { headers: cacheHeaders });
  } catch (error) {
    console.error('[GitHub languages] Request failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

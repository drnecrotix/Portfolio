import { NextResponse } from 'next/server';
import { getRuntimeIntegrationValue } from '@/lib/integration-runtime';

const cacheHeaders = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' };

export async function GET() {
  const githubToken = await getRuntimeIntegrationValue('github.apiKey', 'GITHUB_TOKEN');
  if (!githubToken) {
    return NextResponse.json({ error: 'GitHub metrics are unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const query = `
    query {
      viewer {
        login
        followers { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes { stargazerCount forkCount }
        }
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount date } }
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
      console.warn('[GitHub stats] GraphQL request failed with status', res.status);
      return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const json = await res.json();
    if (Array.isArray(json?.errors) || !json?.data?.viewer) {
      console.warn('[GitHub stats] Unexpected GraphQL response');
      return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const data = json.data.viewer;
    const repos = Array.isArray(data?.repositories?.nodes) ? data.repositories.nodes : [];
    const totalStars = repos.reduce((sum: number, repo: { stargazerCount?: number }) => sum + Number(repo?.stargazerCount ?? 0), 0);
    const totalForks = repos.reduce((sum: number, repo: { forkCount?: number }) => sum + Number(repo?.forkCount ?? 0), 0);

    const contributions = data?.contributionsCollection ?? {};
    const weeks = Array.isArray(contributions?.contributionCalendar?.weeks) ? contributions.contributionCalendar.weeks : [];
    const flatDays = weeks.flatMap((week: { contributionDays?: Array<{ contributionCount?: number; date?: string }> }) => Array.isArray(week?.contributionDays) ? week.contributionDays : []);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = flatDays
      .filter((day: { date?: string }) => {
        const time = new Date(String(day?.date ?? '')).getTime();
        return Number.isFinite(time) && time >= oneWeekAgo;
      })
      .reduce((sum: number, day: { contributionCount?: number }) => sum + Number(day?.contributionCount ?? 0), 0);
    const bestDay = flatDays.reduce((max: number, day: { contributionCount?: number }) => Math.max(max, Number(day?.contributionCount ?? 0)), 0);

    let recentActivity: Array<Record<string, unknown>> = [];
    const username = String(data?.login ?? '').trim();
    if (username) {
      try {
        const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=20`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(8000),
        });
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          if (Array.isArray(events)) {
            recentActivity = events
              .filter((event) => event?.type === 'PushEvent' || event?.type === 'PullRequestEvent')
              .slice(0, 6)
              .map((event) => event?.type === 'PushEvent'
                ? {
                    type: 'push',
                    repo: String(event?.repo?.name ?? ''),
                    branch: String(event?.payload?.ref ?? '').replace('refs/heads/', ''),
                    message: String(event?.payload?.commits?.[0]?.message ?? 'Commit'),
                    date: event?.created_at ?? null,
                  }
                : {
                    type: 'pr',
                    repo: String(event?.repo?.name ?? ''),
                    title: String(event?.payload?.pull_request?.title ?? 'Pull request'),
                    status: String(event?.payload?.action ?? ''),
                    merged: Boolean(event?.payload?.pull_request?.merged),
                    date: event?.created_at ?? null,
                    url: String(event?.payload?.pull_request?.html_url ?? ''),
                  });
          }
        }
      } catch (error) {
        console.warn('[GitHub stats] Recent activity request failed:', error instanceof Error ? error.message : 'unknown error');
      }
    }

    return NextResponse.json({
      data: {
        username,
        totalStars,
        totalForks,
        totalCommits: Number(contributions?.totalCommitContributions ?? 0),
        totalPRs: Number(contributions?.totalPullRequestContributions ?? 0),
        totalContributions: Number(contributions?.contributionCalendar?.totalContributions ?? 0),
        thisWeek,
        bestDay,
        followers: Number(data?.followers?.totalCount ?? 0),
        recentActivity,
      },
    }, { headers: cacheHeaders });
  } catch (error) {
    console.error('[GitHub stats] Request failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'GitHub metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

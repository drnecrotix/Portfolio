import { NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const cacheHeaders = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };

const languageMap: Record<string, string> = {
  TypeScript: 'TypeScript',
  JavaScript: 'JavaScript',
  Python: 'Python',
  PHP: 'PHP',
  Java: 'Java',
  'C#': 'C#',
  'C++': 'C++',
  C: 'C',
  Go: 'Go',
  Rust: 'Rust',
  Kotlin: 'Kotlin',
  Swift: 'Swift',
  Dart: 'Dart',
  Ruby: 'Ruby',
  Lua: 'Lua',
};

const dependencyRules: Array<[RegExp, string]> = [
  [/^next$/i, 'Next.js'],
  [/^(react|react-dom)$/i, 'React'],
  [/^typescript$/i, 'TypeScript'],
  [/^(tailwindcss|@tailwindcss\/)/i, 'Tailwind CSS'],
  [/^(@prisma\/client|prisma)$/i, 'Prisma'],
  [/^(three|@react-three\/)/i, 'Three.js'],
  [/^bootstrap$/i, 'Bootstrap'],
  [/^express$/i, 'Express'],
  [/^(fastify|@fastify\/)/i, 'Fastify'],
  [/^(@nestjs\/|nestjs)/i, 'NestJS'],
  [/^discord\.js$/i, 'Discord.js'],
  [/^(vite|@vitejs\/)/i, 'Vite'],
  [/^vue$/i, 'Vue'],
  [/^svelte$/i, 'Svelte'],
  [/^astro$/i, 'Astro'],
  [/^(framer-motion|motion)$/i, 'Framer Motion'],
  [/^gsap$/i, 'GSAP'],
  [/^(@splinetool\/)/i, 'Spline'],
  [/^(next-auth|@auth\/)/i, 'NextAuth'],
  [/^openai$/i, 'OpenAI'],
  [/^(@anthropic-ai\/sdk|anthropic)$/i, 'Anthropic'],
  [/^(pg|postgres|postgresql)$/i, 'PostgreSQL'],
  [/^(mysql2|mysql)$/i, 'MySQL'],
  [/^(mongodb|mongoose)$/i, 'MongoDB'],
  [/^redis$/i, 'Redis'],
  [/^(@aws-sdk\/)/i, 'AWS'],
  [/^(wrangler|@cloudflare\/)/i, 'Cloudflare'],
];

const textRules: Array<[RegExp, string]> = [
  [/\bfastapi\b/i, 'FastAPI'],
  [/\bdjango\b/i, 'Django'],
  [/\bflask\b/i, 'Flask'],
  [/\bpandas\b/i, 'Pandas'],
  [/\bnumpy\b/i, 'NumPy'],
  [/\b(torch|pytorch)\b/i, 'PyTorch'],
  [/\btensorflow\b/i, 'TensorFlow'],
  [/\bopencv(?:-python)?\b/i, 'OpenCV'],
  [/\bscikit-learn\b/i, 'scikit-learn'],
  [/\bsqlalchemy\b/i, 'SQLAlchemy'],
  [/\bopenai\b/i, 'OpenAI'],
  [/\banthropic\b/i, 'Anthropic'],
  [/\bwordpress\b/i, 'WordPress'],
  [/\blaravel\b/i, 'Laravel'],
  [/\bsymfony\b/i, 'Symfony'],
];

const topicMap: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  php: 'PHP',
  prisma: 'Prisma',
  tailwindcss: 'Tailwind CSS',
  docker: 'Docker',
  cloudflare: 'Cloudflare',
  wordpress: 'WordPress',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  threejs: 'Three.js',
  'three-js': 'Three.js',
  openai: 'OpenAI',
  fastapi: 'FastAPI',
  django: 'Django',
  flask: 'Flask',
  minecraft: 'Minecraft',
  discord: 'Discord',
};

type RepoNode = {
  name?: string;
  url?: string;
  updatedAt?: string;
  languages?: { nodes?: Array<{ name?: string }> };
  repositoryTopics?: { nodes?: Array<{ topic?: { name?: string } }> };
  packageJson?: { text?: string } | null;
  requirements?: { text?: string } | null;
  pyproject?: { text?: string } | null;
  composer?: { text?: string } | null;
  dockerFile?: { __typename?: string } | null;
  workflows?: { __typename?: string } | null;
};

type RepoExample = { name: string; url: string; updatedAt: string };

function addDependencyTechnologies(text: string | undefined, technologies: Set<string>) {
  if (!text) return;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const dependencyNames = new Set<string>();
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const value = parsed[section];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value as Record<string, unknown>).forEach((name) => dependencyNames.add(name));
      }
    }

    const engines = parsed.engines;
    if (engines && typeof engines === 'object' && !Array.isArray(engines) && 'node' in engines) {
      technologies.add('Node.js');
    }

    for (const dependency of dependencyNames) {
      for (const [pattern, technology] of dependencyRules) {
        if (pattern.test(dependency)) technologies.add(technology);
      }
    }
  } catch {
    // A malformed package manifest should not break the public proof endpoint.
  }
}

function addTextTechnologies(text: string | undefined, technologies: Set<string>) {
  if (!text) return;
  for (const [pattern, technology] of textRules) {
    if (pattern.test(text)) technologies.add(technology);
  }
}

export async function GET() {
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: 'GitHub proof data is unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const query = `
    query LabProof {
      viewer {
        login
        repositories(
          first: 50
          ownerAffiliations: OWNER
          isFork: false
          privacy: PUBLIC
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          totalCount
          nodes {
            name
            url
            updatedAt
            languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
              nodes { name }
            }
            repositoryTopics(first: 8) {
              nodes { topic { name } }
            }
            packageJson: object(expression: "HEAD:package.json") {
              ... on Blob { text }
            }
            requirements: object(expression: "HEAD:requirements.txt") {
              ... on Blob { text }
            }
            pyproject: object(expression: "HEAD:pyproject.toml") {
              ... on Blob { text }
            }
            composer: object(expression: "HEAD:composer.json") {
              ... on Blob { text }
            }
            dockerFile: object(expression: "HEAD:Dockerfile") { __typename }
            workflows: object(expression: "HEAD:.github/workflows") { __typename }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NecrotixLab-Portfolio',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn('[GitHub proof] GraphQL request failed with status', response.status);
      return NextResponse.json(
        { error: 'GitHub proof data is temporarily unavailable.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const json = await response.json();
    if (Array.isArray(json?.errors) || !json?.data?.viewer) {
      console.warn('[GitHub proof] Unexpected GraphQL response');
      return NextResponse.json(
        { error: 'GitHub proof data is temporarily unavailable.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const viewer = json.data.viewer;
    const repositories = Array.isArray(viewer?.repositories?.nodes)
      ? (viewer.repositories.nodes as RepoNode[])
      : [];

    const technologyRepos = new Map<string, Map<string, RepoExample>>();

    for (const repo of repositories) {
      const name = String(repo?.name ?? '').trim();
      const url = String(repo?.url ?? '').trim();
      const updatedAt = String(repo?.updatedAt ?? '').trim();
      if (!name || !url) continue;

      const technologies = new Set<string>();

      for (const language of repo?.languages?.nodes ?? []) {
        const normalized = languageMap[String(language?.name ?? '')];
        if (normalized) technologies.add(normalized);
      }

      for (const topicNode of repo?.repositoryTopics?.nodes ?? []) {
        const topic = String(topicNode?.topic?.name ?? '').trim().toLowerCase();
        const normalized = topicMap[topic];
        if (normalized) technologies.add(normalized);
      }

      addDependencyTechnologies(repo?.packageJson?.text, technologies);
      addTextTechnologies(repo?.requirements?.text, technologies);
      addTextTechnologies(repo?.pyproject?.text, technologies);
      addTextTechnologies(repo?.composer?.text, technologies);

      if (repo?.dockerFile) technologies.add('Docker');
      if (repo?.workflows) technologies.add('GitHub Actions');

      for (const technology of technologies) {
        const repoMap = technologyRepos.get(technology) ?? new Map<string, RepoExample>();
        repoMap.set(name, { name, url, updatedAt });
        technologyRepos.set(technology, repoMap);
      }
    }

    const technologies = [...technologyRepos.entries()]
      .map(([name, repoMap]) => {
        const examples = [...repoMap.values()]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 3);
        return {
          name,
          repositories: repoMap.size,
          examples,
        };
      })
      .sort((a, b) => {
        if (b.repositories !== a.repositories) return b.repositories - a.repositories;
        const aLatest = new Date(a.examples[0]?.updatedAt ?? 0).getTime();
        const bLatest = new Date(b.examples[0]?.updatedAt ?? 0).getTime();
        return bLatest - aLatest;
      })
      .slice(0, 8);

    if (technologies.length === 0) {
      return NextResponse.json(
        { error: 'GitHub proof data did not contain detectable technologies.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        data: {
          source: 'github',
          username: String(viewer?.login ?? '').trim(),
          publicRepositories: Number(viewer?.repositories?.totalCount ?? repositories.length),
          analyzedRepositories: repositories.length,
          updatedAt: new Date().toISOString(),
          technologies,
        },
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.error('[GitHub proof] Request failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'GitHub proof data is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

import { NextResponse } from 'next/server';
import { getRuntimeGithubConfig } from '@/lib/integration-runtime';

const cacheHeaders = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };

const languageMap: Record<string, string> = {
  TypeScript: 'TypeScript', JavaScript: 'JavaScript', Python: 'Python', PHP: 'PHP', Java: 'Java',
  'C#': 'C#', 'C++': 'C++', C: 'C', Go: 'Go', Rust: 'Rust', Kotlin: 'Kotlin', Swift: 'Swift', Dart: 'Dart', Ruby: 'Ruby', Lua: 'Lua',
};

const dependencyRules: Array<[RegExp, string]> = [
  [/^next$/i, 'Next.js'], [/^(react|react-dom)$/i, 'React'], [/^typescript$/i, 'TypeScript'], [/^(tailwindcss|@tailwindcss\/)/i, 'Tailwind CSS'],
  [/^(@prisma\/client|prisma)$/i, 'Prisma'], [/^(three|@react-three\/)/i, 'Three.js'], [/^bootstrap$/i, 'Bootstrap'], [/^express$/i, 'Express'],
  [/^(fastify|@fastify\/)/i, 'Fastify'], [/^(@nestjs\/|nestjs)/i, 'NestJS'], [/^discord\.js$/i, 'Discord.js'], [/^(vite|@vitejs\/)/i, 'Vite'],
  [/^vue$/i, 'Vue'], [/^svelte$/i, 'Svelte'], [/^astro$/i, 'Astro'], [/^(framer-motion|motion)$/i, 'Framer Motion'], [/^gsap$/i, 'GSAP'],
  [/^(@splinetool\/)/i, 'Spline'], [/^(next-auth|@auth\/)/i, 'NextAuth'], [/^openai$/i, 'OpenAI'], [/^(@anthropic-ai\/sdk|anthropic)$/i, 'Anthropic'],
  [/^(pg|postgres|postgresql)$/i, 'PostgreSQL'], [/^(mysql2|mysql)$/i, 'MySQL'], [/^(mongodb|mongoose)$/i, 'MongoDB'], [/^redis$/i, 'Redis'],
  [/^(@aws-sdk\/)/i, 'AWS'], [/^(wrangler|@cloudflare\/)/i, 'Cloudflare'],
];

const textRules: Array<[RegExp, string]> = [
  [/\bfastapi\b/i, 'FastAPI'], [/\bdjango\b/i, 'Django'], [/\bflask\b/i, 'Flask'], [/\bpandas\b/i, 'Pandas'], [/\bnumpy\b/i, 'NumPy'],
  [/\b(torch|pytorch)\b/i, 'PyTorch'], [/\btensorflow\b/i, 'TensorFlow'], [/\bopencv(?:-python)?\b/i, 'OpenCV'], [/\bscikit-learn\b/i, 'scikit-learn'],
  [/\bsqlalchemy\b/i, 'SQLAlchemy'], [/\bopenai\b/i, 'OpenAI'], [/\banthropic\b/i, 'Anthropic'], [/\bwordpress\b/i, 'WordPress'],
  [/\blaravel\b/i, 'Laravel'], [/\bsymfony\b/i, 'Symfony'],
];

const topicMap: Record<string, string> = {
  nextjs: 'Next.js', react: 'React', typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python', php: 'PHP', prisma: 'Prisma',
  tailwindcss: 'Tailwind CSS', docker: 'Docker', cloudflare: 'Cloudflare', wordpress: 'WordPress', postgresql: 'PostgreSQL', mongodb: 'MongoDB',
  redis: 'Redis', threejs: 'Three.js', 'three-js': 'Three.js', openai: 'OpenAI', fastapi: 'FastAPI', django: 'Django', flask: 'Flask',
  minecraft: 'Minecraft', discord: 'Discord', next: 'Next.js', nodejs: 'Node.js', 'node-js': 'Node.js',
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
type ProofData = {
  source: 'github';
  transport: 'graphql' | 'rest';
  username: string;
  publicRepositories: number;
  analyzedRepositories: number;
  updatedAt: string;
  technologies: Array<{ name: string; repositories: number; examples: RepoExample[] }>;
};

type RestRepo = {
  name?: string;
  html_url?: string;
  updated_at?: string;
  language?: string | null;
  topics?: string[];
  fork?: boolean;
};

function addDependencyTechnologies(text: string | undefined, technologies: Set<string>) {
  if (!text) return;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const dependencyNames = new Set<string>();
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const value = parsed[section];
      if (value && typeof value === 'object' && !Array.isArray(value)) Object.keys(value as Record<string, unknown>).forEach((name) => dependencyNames.add(name));
    }
    const engines = parsed.engines;
    if (engines && typeof engines === 'object' && !Array.isArray(engines) && 'node' in engines) technologies.add('Node.js');
    for (const dependency of dependencyNames) for (const [pattern, technology] of dependencyRules) if (pattern.test(dependency)) technologies.add(technology);
  } catch {
    // Ignore malformed manifests.
  }
}

function addTextTechnologies(text: string | undefined, technologies: Set<string>) {
  if (!text) return;
  for (const [pattern, technology] of textRules) if (pattern.test(text)) technologies.add(technology);
}

function buildProof(username: string, publicRepositories: number, repositories: Array<{ name: string; url: string; updatedAt: string; technologies: Set<string> }>, transport: ProofData['transport']): ProofData | null {
  const technologyRepos = new Map<string, Map<string, RepoExample>>();
  for (const repo of repositories) {
    for (const technology of repo.technologies) {
      const repoMap = technologyRepos.get(technology) ?? new Map<string, RepoExample>();
      repoMap.set(repo.name, { name: repo.name, url: repo.url, updatedAt: repo.updatedAt });
      technologyRepos.set(technology, repoMap);
    }
  }

  const technologies = [...technologyRepos.entries()]
    .map(([name, repoMap]) => ({
      name,
      repositories: repoMap.size,
      examples: [...repoMap.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3),
    }))
    .sort((a, b) => b.repositories - a.repositories || new Date(b.examples[0]?.updatedAt ?? 0).getTime() - new Date(a.examples[0]?.updatedAt ?? 0).getTime())
    .slice(0, 8);

  if (technologies.length === 0) return null;
  return {
    source: 'github', transport, username, publicRepositories, analyzedRepositories: repositories.length,
    updatedAt: new Date().toISOString(), technologies,
  };
}

async function graphQlProof(username: string, token: string): Promise<ProofData | null> {
  if (!username || !token) return null;
  const query = `
    query LabProof($login: String!) {
      user(login: $login) {
        login
        repositories(first: 50, isFork: false, privacy: PUBLIC, orderBy: { field: UPDATED_AT, direction: DESC }) {
          totalCount
          nodes {
            name url updatedAt
            languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { nodes { name } }
            repositoryTopics(first: 8) { nodes { topic { name } } }
            packageJson: object(expression: "HEAD:package.json") { ... on Blob { text } }
            requirements: object(expression: "HEAD:requirements.txt") { ... on Blob { text } }
            pyproject: object(expression: "HEAD:pyproject.toml") { ... on Blob { text } }
            composer: object(expression: "HEAD:composer.json") { ... on Blob { text } }
            dockerFile: object(expression: "HEAD:Dockerfile") { __typename }
            workflows: object(expression: "HEAD:.github/workflows") { __typename }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'NecrotixLab-Portfolio' },
    body: JSON.stringify({ query, variables: { login: username } }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const json = await response.json();
  if (Array.isArray(json?.errors) || !json?.data?.user) return null;

  const user = json.data.user;
  const nodes = Array.isArray(user?.repositories?.nodes) ? user.repositories.nodes as RepoNode[] : [];
  const repositories = nodes.flatMap((repo) => {
    const name = String(repo?.name ?? '').trim();
    const url = String(repo?.url ?? '').trim();
    const updatedAt = String(repo?.updatedAt ?? '').trim();
    if (!name || !url) return [];
    const technologies = new Set<string>();
    for (const language of repo?.languages?.nodes ?? []) {
      const normalized = languageMap[String(language?.name ?? '')];
      if (normalized) technologies.add(normalized);
    }
    for (const topicNode of repo?.repositoryTopics?.nodes ?? []) {
      const normalized = topicMap[String(topicNode?.topic?.name ?? '').trim().toLowerCase()];
      if (normalized) technologies.add(normalized);
    }
    addDependencyTechnologies(repo?.packageJson?.text, technologies);
    addTextTechnologies(repo?.requirements?.text, technologies);
    addTextTechnologies(repo?.pyproject?.text, technologies);
    addTextTechnologies(repo?.composer?.text, technologies);
    if (repo?.dockerFile) technologies.add('Docker');
    if (repo?.workflows) technologies.add('GitHub Actions');
    return [{ name, url, updatedAt, technologies }];
  });

  return buildProof(String(user?.login ?? username).trim(), Number(user?.repositories?.totalCount ?? repositories.length), repositories, 'graphql');
}

async function restProof(username: string, token?: string): Promise<ProofData | null> {
  if (!username) return null;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Portfolio' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated&direction=desc`, {
    headers, cache: 'no-store', signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const json = await response.json();
  if (!Array.isArray(json)) return null;

  const publicRepos = (json as RestRepo[]).filter((repo) => !repo?.fork);
  const repositories = publicRepos.flatMap((repo) => {
    const name = String(repo?.name ?? '').trim();
    const url = String(repo?.html_url ?? '').trim();
    const updatedAt = String(repo?.updated_at ?? '').trim();
    if (!name || !url) return [];
    const technologies = new Set<string>();
    const primaryLanguage = languageMap[String(repo?.language ?? '')];
    if (primaryLanguage) technologies.add(primaryLanguage);
    for (const topic of Array.isArray(repo?.topics) ? repo.topics : []) {
      const normalized = topicMap[String(topic).trim().toLowerCase()];
      if (normalized) technologies.add(normalized);
    }
    return [{ name, url, updatedAt, technologies }];
  });
  return buildProof(username, publicRepos.length, repositories, 'rest');
}

export async function GET() {
  const { token, username } = await getRuntimeGithubConfig();
  if (!username) {
    return NextResponse.json({ error: 'GitHub username is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const graphData = token ? await graphQlProof(username, token) : null;
    const data = graphData ?? await restProof(username, token || undefined);
    if (!data) {
      return NextResponse.json({ error: 'GitHub proof data is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ data }, { headers: cacheHeaders });
  } catch (error) {
    console.error('[GitHub proof] Request failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'GitHub proof data is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, 'src');
const sourcePattern = /\.(?:ts|tsx|js|jsx)$/i;
const clientDirective = /^\s*['"]use client['"];?/;

const forbiddenImports = [
    '@/auth',
    '@/lib/prisma',
    '@/lib/assistant-credentials',
    '@/lib/integration-credentials',
    '@/lib/integration-runtime',
    '@/lib/comment-challenge',
    '@/lib/creem',
    '@/lib/lemonsqueezy',
    '@/lib/store-storage',
    '@/lib/legal-settings',
    '@/lib/social-metadata',
];

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walk(absolute));
        else if (entry.isFile() && sourcePattern.test(entry.name)) files.push(absolute);
    }

    return files;
}

function relative(file) {
    return path.relative(appRoot, file).replaceAll(path.sep, '/');
}

function hasRuntimePrismaImport(content) {
    const staticImports = content.match(/import\s+(?:type\s+)?[\s\S]*?\sfrom\s+['"]@prisma\/client['"];?/g) || [];
    if (staticImports.some((statement) => !/^import\s+type\b/.test(statement.trim()))) return true;

    if (/import\s*\(\s*['"]@prisma\/client['"]\s*\)/.test(content)) return true;
    if (/require\s*\(\s*['"]@prisma\/client['"]\s*\)/.test(content)) return true;

    return false;
}

const files = await walk(srcRoot);
const violations = [];
let clientFiles = 0;

for (const file of files) {
    const content = await readFile(file, 'utf8');
    const normalized = content.replace(/^\uFEFF/, '');
    if (!clientDirective.test(normalized)) continue;
    clientFiles += 1;

    for (const moduleName of forbiddenImports) {
        const quoted = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const importPattern = new RegExp(`(?:from\\s+|import\\s*\\()(['\"])${quoted}\\1`);
        if (importPattern.test(content)) {
            violations.push(`${relative(file)} imports server-only module ${moduleName}`);
        }
    }

    if (hasRuntimePrismaImport(content)) {
        violations.push(`${relative(file)} imports Prisma runtime from @prisma/client`);
    }

    for (const match of content.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        const envName = match[1];
        if (!envName.startsWith('NEXT_PUBLIC_')) {
            violations.push(`${relative(file)} references private environment variable ${envName}`);
        }
    }

    if (/process\.env\s*\[/.test(content)) {
        violations.push(`${relative(file)} uses dynamic process.env access in a Client Component`);
    }

    if (/from\s+['"]node:/.test(content) || /import\s*\(\s*['"]node:/.test(content)) {
        violations.push(`${relative(file)} imports a Node.js built-in from a Client Component`);
    }
}

if (violations.length > 0) {
    console.error('[client-boundary-audit] Client/server boundary violations found:');
    for (const violation of [...new Set(violations)]) console.error(` - ${violation}`);
    process.exit(1);
}

console.log(`[client-boundary-audit] Passed. Inspected ${clientFiles} Client Components with no private env or runtime server-only imports.`);

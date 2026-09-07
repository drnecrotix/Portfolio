import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, 'src');
const sourcePattern = /\.(?:ts|tsx|js|jsx)$/i;
const clientDirective = /^\s*['"]use client['"];?/;

const forbiddenImports = new Set([
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
    '@prisma/client',
]);

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

function scriptKindFor(file) {
    if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
    if (file.endsWith('.js')) return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
}

function isTypeOnlyImport(node) {
    const clause = node.importClause;
    if (!clause) return false;
    if (clause.isTypeOnly) return true;
    if (clause.name) return false;

    const bindings = clause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings) || bindings.elements.length === 0) return false;
    return bindings.elements.every((element) => element.isTypeOnly);
}

function inspectRuntimeImports(file, content, violations) {
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKindFor(file));

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

        const moduleName = statement.moduleSpecifier.text;
        if (isTypeOnlyImport(statement)) continue;

        if (forbiddenImports.has(moduleName)) {
            violations.push(`${relative(file)} imports runtime server-only module ${moduleName}`);
        }

        if (moduleName.startsWith('node:')) {
            violations.push(`${relative(file)} imports Node.js runtime module ${moduleName}`);
        }
    }

    for (const match of content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const moduleName = match[1];
        if (forbiddenImports.has(moduleName) || moduleName === '@prisma/client') {
            violations.push(`${relative(file)} dynamically imports runtime server-only module ${moduleName}`);
        }
        if (moduleName.startsWith('node:')) {
            violations.push(`${relative(file)} dynamically imports Node.js runtime module ${moduleName}`);
        }
    }

    for (const match of content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const moduleName = match[1];
        if (forbiddenImports.has(moduleName) || moduleName === '@prisma/client') {
            violations.push(`${relative(file)} requires runtime server-only module ${moduleName}`);
        }
        if (moduleName.startsWith('node:')) {
            violations.push(`${relative(file)} requires Node.js runtime module ${moduleName}`);
        }
    }
}

const files = await walk(srcRoot);
const violations = [];
let clientFiles = 0;

for (const file of files) {
    const content = await readFile(file, 'utf8');
    const normalized = content.replace(/^\uFEFF/, '');
    if (!clientDirective.test(normalized)) continue;
    clientFiles += 1;

    inspectRuntimeImports(file, content, violations);

    for (const match of content.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        const envName = match[1];
        if (!envName.startsWith('NEXT_PUBLIC_')) {
            violations.push(`${relative(file)} references private environment variable ${envName}`);
        }
    }

    if (/process\.env\s*\[/.test(content)) {
        violations.push(`${relative(file)} uses dynamic process.env access in a Client Component`);
    }
}

if (violations.length > 0) {
    console.error('[client-boundary-audit] Client/server boundary violations found:');
    for (const violation of [...new Set(violations)]) console.error(` - ${violation}`);
    process.exit(1);
}

console.log(`[client-boundary-audit] Passed. Inspected ${clientFiles} Client Components with no private env or runtime server-only imports.`);

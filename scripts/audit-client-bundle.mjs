import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = process.cwd();
const distDir = process.env.NEXT_DIST_DIR?.trim() || '.next';
const staticRoot = path.join(appRoot, distDir, 'static');

const sensitiveEnvNames = [
    'AUTH_SECRET',
    'DATABASE_URL',
    'AI_CREDENTIALS_SECRET',
    'INTEGRATION_CREDENTIALS_SECRET',
    'EMAIL_PASS',
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
    'CREEM_API_KEY',
    'CREEM_WEBHOOK_SECRET',
    'R2_SECRET_ACCESS_KEY',
    'AWS_SECRET_ACCESS_KEY',
];

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walk(absolute));
        else if (entry.isFile()) files.push(absolute);
    }

    return files;
}

function relative(file) {
    return path.relative(appRoot, file).replaceAll(path.sep, '/');
}

let files;
try {
    files = await walk(staticRoot);
} catch (error) {
    console.error(`[client-bundle-audit] Unable to inspect ${relative(staticRoot)}.`);
    throw error;
}

const sourceMaps = files.filter((file) => file.endsWith('.map'));
if (sourceMaps.length > 0) {
    console.error('[client-bundle-audit] Browser source maps were emitted:');
    for (const file of sourceMaps) console.error(` - ${relative(file)}`);
    process.exit(1);
}

const readableFiles = files.filter((file) => /\.(?:js|css|json)$/i.test(file));
const canaries = sensitiveEnvNames
    .map((name) => [name, String(process.env[name] || '')])
    .filter(([, value]) => value.length >= 8);

const leaks = [];
const mappingReferences = [];

for (const file of readableFiles) {
    const content = await readFile(file, 'utf8');

    if (/sourceMappingURL\s*=/.test(content)) {
        mappingReferences.push(relative(file));
    }

    for (const [name, value] of canaries) {
        if (content.includes(value)) leaks.push({ name, file: relative(file) });
    }
}

if (mappingReferences.length > 0) {
    console.error('[client-bundle-audit] Client assets contain sourceMappingURL references:');
    for (const file of mappingReferences) console.error(` - ${file}`);
    process.exitCode = 1;
}

if (leaks.length > 0) {
    console.error('[client-bundle-audit] Sensitive environment values were found in browser assets:');
    for (const leak of leaks) console.error(` - ${leak.name} in ${leak.file}`);
    process.exitCode = 1;
}

if (process.exitCode) process.exit(process.exitCode);

console.log(`[client-bundle-audit] Passed. Inspected ${readableFiles.length} browser assets with no source maps or sensitive environment values.`);

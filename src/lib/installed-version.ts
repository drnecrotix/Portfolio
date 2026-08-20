import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJsonVersion(file: string) {
    try {
        if (!existsSync(file)) return undefined;
        return (JSON.parse(readFileSync(file, 'utf8')) as { version?: string }).version;
    } catch {
        return undefined;
    }
}

export function installedPortfolioVersion() {
    const root = process.cwd();
    return readJsonVersion(join(root, 'tmp', 'installed-version.json'))
        || readJsonVersion(join(root, 'package.json'))
        || 'unknown';
}

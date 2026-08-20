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

    // package.json is the deployed code's source of truth. The tmp marker is only a fallback
    // for unusual hosting states where package.json cannot be read.
    return readJsonVersion(join(root, 'package.json'))
        || readJsonVersion(join(root, 'tmp', 'installed-version.json'))
        || 'unknown';
}

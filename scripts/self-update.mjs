import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statusDir = join(appRoot, 'tmp');
const statusFile = join(statusDir, 'update-status.json');
mkdirSync(statusDir, { recursive: true });

function status(state, message, extra = {}) {
  writeFileSync(statusFile, JSON.stringify({ state, message, updatedAt: new Date().toISOString(), ...extra }, null, 2));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd || appRoot, env: process.env, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || '').trim().slice(-2000);
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout?.trim() || '';
}

let workDir;
try {
  status('running', 'Downloading the latest Portfolio release…');
  workDir = mkdtempSync(join(tmpdir(), 'portfolio-update-'));
  const checkout = join(workDir, 'repo');
  run('git', ['clone', '--depth', '1', '--branch', 'main', 'https://github.com/drnecrotix/Portfolio.git', checkout]);

  const remotePackage = JSON.parse(readFileSync(join(checkout, 'package.json'), 'utf8'));
  status('running', `Installing Portfolio ${remotePackage.version || 'latest'}…`, { targetVersion: remotePackage.version || null });

  run('rsync', [
    '-a',
    '--exclude=.git',
    '--exclude=.env',
    '--exclude=node_modules',
    '--exclude=.next',
    '--exclude=tmp',
    '--exclude=public/.htaccess',
    `${checkout}/`,
    `${appRoot}/`,
  ]);

  status('running', 'Installing dependencies…', { targetVersion: remotePackage.version || null });
  run('npm', ['install', '--no-audit', '--no-fund']);
  status('running', 'Applying database migrations…', { targetVersion: remotePackage.version || null });
  run('npm', ['run', 'db:generate']);
  run('npm', ['run', 'db:deploy']);
  status('running', 'Building the production application…', { targetVersion: remotePackage.version || null });
  run('npm', ['run', 'build:n0c']);

  status('success', `Portfolio ${remotePackage.version || 'latest'} installed. Passenger restart requested.`, { targetVersion: remotePackage.version || null });
  writeFileSync(join(statusDir, 'restart.txt'), `${Date.now()}\n`);
} catch (error) {
  status('error', error instanceof Error ? error.message : 'Unknown update error');
  process.exitCode = 1;
} finally {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
}

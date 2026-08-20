import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  const result = spawnSync(command, args, {
    cwd: options.cwd || appRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || '').trim().slice(-2000);
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout?.trim() || '';
}

function sameFile(left, right) {
  if (!existsSync(left) || !existsSync(right)) return false;
  return readFileSync(left).equals(readFileSync(right));
}

let workDir;
let modulesBackup;
let dependenciesReplaced = false;

try {
  status('running', 'Downloading the latest Portfolio release…');
  workDir = mkdtempSync(join(tmpdir(), 'portfolio-update-'));
  const checkout = join(workDir, 'repo');
  run('git', ['clone', '--depth', '1', '--branch', 'main', 'https://github.com/drnecrotix/Portfolio.git', checkout]);

  const remotePackage = JSON.parse(readFileSync(join(checkout, 'package.json'), 'utf8'));
  const currentLock = join(appRoot, 'package-lock.json');
  const remoteLock = join(checkout, 'package-lock.json');
  const dependenciesChanged = !sameFile(currentLock, remoteLock);

  status('running', `Installing Portfolio ${remotePackage.version || 'latest'}…`, {
    targetVersion: remotePackage.version || null,
  });

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

  if (dependenciesChanged || !existsSync(join(appRoot, 'node_modules'))) {
    status('running', 'Installing dependencies for N0C…', { targetVersion: remotePackage.version || null });

    const modulesPath = join(appRoot, 'node_modules');
    if (existsSync(modulesPath)) {
      modulesBackup = join(dirname(appRoot), `.necrotixlab-node_modules-backup-${Date.now()}`);
      renameSync(modulesPath, modulesBackup);
    }

    try {
      run('npm', ['install', '--legacy-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund']);
      dependenciesReplaced = true;
    } catch (error) {
      rmSync(modulesPath, { recursive: true, force: true });
      if (modulesBackup && existsSync(modulesBackup)) renameSync(modulesBackup, modulesPath);
      modulesBackup = undefined;
      throw error;
    }
  } else {
    status('running', 'Dependencies unchanged; using the installed N0C modules…', {
      targetVersion: remotePackage.version || null,
    });
  }

  status('running', 'Applying database migrations…', { targetVersion: remotePackage.version || null });
  run('npx', ['--no-install', 'prisma', 'generate']);
  run('npx', ['--no-install', 'prisma', 'migrate', 'deploy']);

  status('running', 'Building the production application…', { targetVersion: remotePackage.version || null });
  const nodeOptions = process.env.NODE_OPTIONS?.trim();
  const buildNodeOptions = nodeOptions?.includes('--max-old-space-size=')
    ? nodeOptions
    : `${nodeOptions ? `${nodeOptions} ` : ''}--max-old-space-size=6144`;
  run('npm', ['run', 'build:n0c'], {
    env: { ...process.env, NODE_OPTIONS: buildNodeOptions },
  });

  if (dependenciesReplaced && modulesBackup && existsSync(modulesBackup)) {
    rmSync(modulesBackup, { recursive: true, force: true });
    modulesBackup = undefined;
  }

  status('success', `Portfolio ${remotePackage.version || 'latest'} installed. Passenger restart requested.`, {
    targetVersion: remotePackage.version || null,
  });
  writeFileSync(join(statusDir, 'restart.txt'), `${Date.now()}\n`);
} catch (error) {
  status('error', error instanceof Error ? error.message : 'Unknown update error');
  process.exitCode = 1;
} finally {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
}

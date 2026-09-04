import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statusDir = join(appRoot, 'tmp');
const statusFile = join(statusDir, 'update-status.json');
const installedVersionFile = join(statusDir, 'installed-version.json');
const nodeBinDir = dirname(process.execPath);
const npmCommand = existsSync(join(nodeBinDir, 'npm')) ? join(nodeBinDir, 'npm') : 'npm';
const require = createRequire(import.meta.url);
mkdirSync(statusDir, { recursive: true });

function status(state, message, extra = {}) {
  writeFileSync(statusFile, JSON.stringify({ state, message, updatedAt: new Date().toISOString(), ...extra }, null, 2));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || appRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || '').trim().slice(-3000);
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout?.trim() || '';
}

function dependencySignature(packageFile) {
  if (!existsSync(packageFile)) return null;
  const packageJson = JSON.parse(readFileSync(packageFile, 'utf8'));
  return JSON.stringify({
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    optionalDependencies: packageJson.optionalDependencies || {},
    peerDependencies: packageJson.peerDependencies || {},
  });
}

function packageVersion(packageFile) {
  if (!existsSync(packageFile)) return 'unknown';
  try {
    return JSON.parse(readFileSync(packageFile, 'utf8')).version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function writeInstalledVersion(version) {
  writeFileSync(installedVersionFile, JSON.stringify({ version, updatedAt: new Date().toISOString() }, null, 2));
}

function resolvePackageFile(path) {
  try {
    return require.resolve(path, { paths: [appRoot] });
  } catch {
    return null;
  }
}

let workDir;
let modulesBackup;
let buildBackup;
let dependenciesReplaced = false;
let targetVersion = null;
const buildDir = join(appRoot, '.next');
const stagedBuildDir = join(appRoot, '.next-update');

function restorePreviousBuild() {
  rmSync(stagedBuildDir, { recursive: true, force: true });
  if (!buildBackup || !existsSync(buildBackup)) return false;
  rmSync(buildDir, { recursive: true, force: true });
  renameSync(buildBackup, buildDir);
  buildBackup = undefined;
  return true;
}

try {
  const currentPackagePath = join(appRoot, 'package.json');
  const startingVersion = packageVersion(currentPackagePath);
  if (!existsSync(installedVersionFile)) writeInstalledVersion(startingVersion);

  status('running', 'Downloading the latest Portfolio release…');
  workDir = mkdtempSync(join(tmpdir(), 'portfolio-update-'));
  const checkout = join(workDir, 'repo');
  run('git', ['clone', '--depth', '1', '--branch', 'main', 'https://github.com/drnecrotix/Portfolio.git', checkout]);

  const remotePackagePath = join(checkout, 'package.json');
  const currentDependencySignature = dependencySignature(currentPackagePath);
  const remoteDependencySignature = dependencySignature(remotePackagePath);
  const remotePackage = JSON.parse(readFileSync(remotePackagePath, 'utf8'));
  targetVersion = remotePackage.version || null;
  const dependenciesChanged = currentDependencySignature !== remoteDependencySignature;

  status('running', `Installing Portfolio ${targetVersion || 'latest'}…`, { targetVersion });

  // Mirror release-controlled files so files removed upstream cannot linger in the
  // production tree and still participate in TypeScript/Next.js builds. Runtime
  // state and locally uploaded media are explicitly excluded and therefore kept.
  run('rsync', [
    '-a',
    '--delete-delay',
    '--exclude=.git',
    '--exclude=.env',
    '--exclude=node_modules',
    '--exclude=.next',
    '--exclude=.next-update',
    '--exclude=tmp',
    '--exclude=public/.htaccess',
    '--exclude=public/.well-known',
    '--exclude=public/uploads',
    `${checkout}/`,
    `${appRoot}/`,
  ]);

  const obsoleteNextConfig = join(appRoot, 'next.config.ts');
  if (existsSync(join(appRoot, 'next.config.mjs')) && !existsSync(join(checkout, 'next.config.ts')) && existsSync(obsoleteNextConfig)) {
    rmSync(obsoleteNextConfig, { force: true });
  }

  const modulesPath = join(appRoot, 'node_modules');
  if (dependenciesChanged || !existsSync(modulesPath)) {
    status('running', 'Installing dependencies for N0C…', { targetVersion });

    const cloudLinuxSymlink = existsSync(modulesPath) && lstatSync(modulesPath).isSymbolicLink();
    if (existsSync(modulesPath) && !cloudLinuxSymlink) {
      modulesBackup = join(dirname(appRoot), `.necrotixlab-node_modules-backup-${Date.now()}`);
      renameSync(modulesPath, modulesBackup);
    }

    try {
      run(npmCommand, ['install', '--legacy-peer-deps', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund'], {
        env: { ...process.env, NODE_ENV: 'development' },
      });
      dependenciesReplaced = true;
    } catch (error) {
      if (modulesBackup) {
        rmSync(modulesPath, { recursive: true, force: true });
        if (existsSync(modulesBackup)) renameSync(modulesBackup, modulesPath);
        modulesBackup = undefined;
      }
      throw error;
    }
  } else {
    status('running', 'Dependencies unchanged; using the installed N0C modules…', { targetVersion });
  }

  const prismaCli = resolvePackageFile('prisma/build/index.js');
  if (!prismaCli) {
    throw new Error('Prisma CLI is not installed in the active N0C Node environment. Restore/install dev dependencies before retrying.');
  }

  const prismaEnv = {
    ...process.env,
    PRISMA_CLIENT_ENGINE_TYPE: 'binary',
    PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary',
  };

  status('running', 'Generating the Prisma client…', { targetVersion });
  run(process.execPath, [prismaCli, 'generate'], { env: prismaEnv });

  status('running', 'Applying database migrations…', { targetVersion });
  run(process.execPath, [prismaCli, 'migrate', 'deploy'], { env: prismaEnv });

  status('running', 'Preparing a staged production build…', { targetVersion });
  rmSync(stagedBuildDir, { recursive: true, force: true });

  // The live .next runtime does not use generated TypeScript declaration files.
  // Remove only those generated type trees so a deleted route cannot remain in
  // tsconfig's .next/types include and poison the next staged build.
  status('running', 'Clearing stale generated Next.js route types…', { targetVersion });
  rmSync(join(buildDir, 'types'), { recursive: true, force: true });
  rmSync(join(buildDir, 'dev', 'types'), { recursive: true, force: true });

  const existingNodeOptions = (process.env.NODE_OPTIONS || '').trim().split(/\s+/).filter(Boolean);
  const buildNodeOptions = [...existingNodeOptions];
  if (!buildNodeOptions.some((option) => option.startsWith('--max-old-space-size='))) buildNodeOptions.push('--max-old-space-size=6144');
  const buildEnv = {
    ...prismaEnv,
    NODE_OPTIONS: buildNodeOptions.join(' '),
    NEXT_N0C_WASM_SWC: '1',
    NEXT_DIST_DIR: '.next-update',
  };
  delete buildEnv.TURBOPACK;
  delete buildEnv.NEXT_TURBOPACK;

  const nextCli = resolvePackageFile('next/dist/bin/next');
  if (!nextCli) {
    throw new Error('Next.js CLI is not installed in the active N0C Node environment.');
  }

  status('running', 'Building the production application without touching the live .next directory…', { targetVersion });
  run(process.execPath, [nextCli, 'build', '--webpack'], { env: buildEnv });

  if (!existsSync(stagedBuildDir)) {
    throw new Error('The staged Next.js build completed without producing .next-update.');
  }

  if (existsSync(join(buildDir, 'static'))) {
    status('running', 'Preserving previous hashed browser chunks for open tabs and cached pages…', { targetVersion });
    mkdirSync(join(stagedBuildDir, 'static'), { recursive: true });
    run('rsync', [
      '-a',
      '--ignore-existing',
      `${join(buildDir, 'static')}/`,
      `${join(stagedBuildDir, 'static')}/`,
    ]);
  }

  status('running', 'Activating the new production build…', { targetVersion });
  if (existsSync(buildDir)) {
    buildBackup = join(dirname(appRoot), `.necrotixlab-next-backup-${Date.now()}`);
    renameSync(buildDir, buildBackup);
  }

  try {
    renameSync(stagedBuildDir, buildDir);
  } catch (error) {
    restorePreviousBuild();
    throw error;
  }

  if (buildBackup && existsSync(buildBackup)) {
    rmSync(buildBackup, { recursive: true, force: true });
    buildBackup = undefined;
  }

  if (dependenciesReplaced && modulesBackup && existsSync(modulesBackup)) {
    rmSync(modulesBackup, { recursive: true, force: true });
    modulesBackup = undefined;
  }

  writeInstalledVersion(targetVersion || 'latest');
  status('success', `Portfolio ${targetVersion || 'latest'} installed. Passenger restart requested.`, { targetVersion });
  writeFileSync(join(statusDir, 'restart.txt'), `${Date.now()}\n`);
} catch (error) {
  const restoredBuild = restorePreviousBuild();
  status('error', `${error instanceof Error ? error.message : 'Unknown update error'}${restoredBuild ? ' Previous production build restored.' : ''}`, { targetVersion });
  process.exitCode = 1;
} finally {
  rmSync(stagedBuildDir, { recursive: true, force: true });
  if (workDir) rmSync(workDir, { recursive: true, force: true });
}

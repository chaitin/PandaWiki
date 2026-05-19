#!/usr/bin/env node
/**
 * 给 node_modules 里的依赖打补丁（与 web/patches/ 共用补丁文件）。
 * 见 web/scripts/apply-patches.mjs 说明。
 */
import { spawnSync } from 'node:child_process';
import { constants } from 'node:fs';
import { accessSync } from 'node:fs';
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, '..');
const WEB_ROOT = resolve(APP_ROOT, '..');
const PATCHES_DIR = resolve(WEB_ROOT, 'patches');

// npm workspace 下依赖会被提升到 web/node_modules；非提升时落在 app/node_modules。
// 两处都找，优先用真实存在的那个。
function resolvePackageDir(pkgName) {
  for (const base of [APP_ROOT, WEB_ROOT]) {
    const p = join(base, 'node_modules', pkgName);
    if (existsSync(p)) return p;
  }
  return null;
}

if (!existsSync(PATCHES_DIR)) {
  console.log('[patches] no patches/ dir, nothing to do');
  process.exit(0);
}

const patchFiles = readdirSync(PATCHES_DIR).filter(f => f.endsWith('.patch'));
if (patchFiles.length === 0) {
  console.log('[patches] no .patch files, nothing to do');
  process.exit(0);
}

let hadError = false;

function resolvePatchCommand() {
  // 先信任 PATH 里的 `patch`：accessSync 不做 PATH 查找，必须真正执行一次探测。
  const probe = spawnSync('patch', ['--version'], { stdio: 'ignore' });
  if (!probe.error && probe.status === 0) {
    return 'patch';
  }
  // 回退到 Git for Windows 自带的 patch.exe
  const candidates = [
    'C:\\Program Files\\Git\\usr\\bin\\patch.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\patch.exe',
  ];
  for (const cmd of candidates) {
    try {
      accessSync(cmd, constants.F_OK);
      return cmd;
    } catch {
      /* try next */
    }
  }
  return null;
}

const patchCommand = resolvePatchCommand();
if (!patchCommand) {
  console.warn(
    '[patches] `patch` not found — skip (install Git for Windows to enable @ctzhian/tiptap patches locally)',
  );
  process.exit(0);
}

for (const patchFile of patchFiles) {
  const m = patchFile.replace(/\.patch$/, '').match(/^(.+)\+([^+]+)$/);
  if (!m) {
    console.warn(`[patches] skip ${patchFile}: cannot parse package name`);
    continue;
  }
  const [, rawName, version] = m;
  const pkgName = rawName.replace(/^@?([^+]+)\+(.+)$/, (_s, scope, name) =>
    rawName.startsWith('@') ? `@${scope}/${name}` : `${scope}/${name}`,
  );

  const linkPath = resolvePackageDir(pkgName);
  if (!linkPath) {
    console.warn(
      `[patches] skip ${patchFile}: ${pkgName} not installed in app/ or web/ node_modules (expected ${pkgName}@${version})`,
    );
    continue;
  }
  const realPath = realpathSync(linkPath);
  if (!statSync(realPath).isDirectory()) {
    console.warn(`[patches] skip ${patchFile}: ${realPath} is not a directory`);
    continue;
  }

  const pkgJsonPath = join(realPath, 'package.json');
  if (existsSync(pkgJsonPath)) {
    const installedVersion = JSON.parse(
      readFileSync(pkgJsonPath, 'utf8'),
    ).version;
    if (installedVersion !== version) {
      console.warn(
        `[patches] WARN ${patchFile}: installed ${pkgName}@${installedVersion} but patch is for ${version}`,
      );
    }
  }

  const patchContent = readFileSync(join(PATCHES_DIR, patchFile), 'utf8');
  const result = spawnSync(
    patchCommand,
    ['--forward', '--silent', '-d', realPath, '-p1'],
    {
      input: patchContent,
      encoding: 'utf8',
    },
  );
  const stdout = (result.stdout ?? '').toString().trim();
  const stderr = (result.stderr ?? '').toString().trim();
  if (result.status === 0) {
    console.log(`[patches] applied: ${patchFile} → ${pkgName}@${version}`);
  } else if (
    /previously applied|Reversed/.test(stderr) ||
    /previously applied|Reversed/.test(stdout)
  ) {
    console.log(`[patches] already applied: ${patchFile}`);
  } else {
    console.error(`[patches] FAILED: ${patchFile} → ${pkgName}@${version}`);
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
    hadError = true;
  }
}

const tiptapDir = resolvePackageDir('@ctzhian/tiptap');
const sentinelPath = tiptapDir
  ? join(tiptapDir, 'dist/extension/component/Link/index.js')
  : null;
if (sentinelPath && existsSync(sentinelPath)) {
  const count =
    readFileSync(sentinelPath, 'utf8').split('pwKbDocLinkPicker').length - 1;
  if (count !== 2) {
    console.warn(
      `[patches] WARN @ctzhian/tiptap patch sentinel count = ${count} (expected 2)`,
    );
  }
}

if (hadError) process.exit(1);

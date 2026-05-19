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
const PATCHES_DIR = resolve(APP_ROOT, '../patches');

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
  const candidates = [
    'patch',
    'C:\\Program Files\\Git\\usr\\bin\\patch.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\patch.exe',
  ];
  for (const cmd of candidates) {
    try {
      accessSync(cmd, constants.X_OK);
      return cmd;
    } catch {
      if (cmd === 'patch') continue;
      try {
        accessSync(cmd, constants.F_OK);
        return cmd;
      } catch {
        /* try next */
      }
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

  const linkPath = join(APP_ROOT, 'node_modules', pkgName);
  if (!existsSync(linkPath)) {
    console.warn(
      `[patches] skip ${patchFile}: ${linkPath} not installed (expected ${pkgName}@${version})`,
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

const sentinelPath = join(
  APP_ROOT,
  'node_modules/@ctzhian/tiptap/dist/extension/component/Link/index.js',
);
if (existsSync(sentinelPath)) {
  const count =
    readFileSync(sentinelPath, 'utf8').split('pwKbDocLinkPicker').length - 1;
  if (count !== 2) {
    console.warn(
      `[patches] WARN @ctzhian/tiptap patch sentinel count = ${count} (expected 2)`,
    );
  }
}

if (hadError) process.exit(1);

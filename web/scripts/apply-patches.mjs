#!/usr/bin/env node
/**
 * 给 node_modules 里的依赖打补丁。
 *
 * 为什么不用 pnpm 内置的 patchedDependencies：
 *   - pnpm 10 在某些环境（store 共享 / 软硬链接特定状态）下会让 patched store
 *     副本被叠加打补丁，导致重新装出来的 dist 文件破损（比如多一个 `)`）。
 *     一旦中招，单纯 `pnpm install --frozen-lockfile` 救不回来。
 *
 * 为什么不用 patch-package：
 *   - patch-package 8.x 跟 `pnpm patch` 生成的 git-style diff (含 index 行)
 *     在某些 hunk 上解析失败，工程上不稳定。
 *
 * 这个脚本只做三件事：
 *   1. 遍历 patches/*.patch
 *   2. 解析文件名得到 scope/name + version （命名约定 `@scope+name+version.patch`）
 *   3. 用系统 `patch` 命令以 `--forward` 模式应用，已经应用过的会被自动跳过；
 *      失败则非零退出，方便在 CI 里立刻发现。
 */
import { execSync, spawnSync } from 'node:child_process';
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
const WEB_ROOT = resolve(__dirname, '..');
const PATCHES_DIR = join(WEB_ROOT, 'patches');

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

for (const patchFile of patchFiles) {
  // 文件名约定：`@scope+name+version.patch` 或 `name+version.patch`
  // 例：`@ctzhian+tiptap+2.9.4.patch` → package `@ctzhian/tiptap`
  const m = patchFile.replace(/\.patch$/, '').match(/^(.+)\+([^+]+)$/);
  if (!m) {
    console.warn(`[patches] skip ${patchFile}: cannot parse package name`);
    continue;
  }
  const [, rawName, version] = m;
  const pkgName = rawName.replace(/^@?([^+]+)\+(.+)$/, (_s, scope, name) =>
    rawName.startsWith('@') ? `@${scope}/${name}` : `${scope}/${name}`,
  );

  // 目标包目录：通过 node_modules/<pkgName> 软链跟过去
  const linkPath = join(WEB_ROOT, 'node_modules', pkgName);
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

  // 校验版本
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

  // 用 patch --forward：补丁已应用则静默跳过；hunk 完全不匹配才报错。
  const patchContent = readFileSync(join(PATCHES_DIR, patchFile), 'utf8');
  const result = spawnSync(
    'patch',
    ['--forward', '--silent', '-d', realPath, '-p1'],
    {
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();
  if (result.status === 0) {
    console.log(`[patches] applied: ${patchFile} → ${pkgName}@${version}`);
  } else if (
    // patch 在已应用时退出码 1 并打印 "Reversed (or previously applied) patch detected"
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

// 兜底自检：检查目标文件是否含我们期望的"指纹"字符串
try {
  const sentinel = execSync(
    `grep -c pwKbDocLinkPicker "${WEB_ROOT}/node_modules/@ctzhian/tiptap/dist/extension/component/Link/index.js" || true`,
    { encoding: 'utf8' },
  ).trim();
  if (sentinel !== '2') {
    console.warn(
      `[patches] WARN @ctzhian/tiptap patch sentinel count = ${sentinel} (expected 2)`,
    );
  }
} catch {
  /* 包未装或不存在，忽略 */
}

if (hadError) process.exit(1);

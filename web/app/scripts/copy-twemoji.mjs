#!/usr/bin/env node
/**
 * 把 @twemoji/svg 的 SVG 资产从 node_modules 复制到 public/twemoji/svg/。
 *
 * 在 dev / build 之前自动跑（见 package.json 的 predev / prebuild）。
 * 这样：
 *   - git 仓库不增加 ~16MB 的 svg 文件（用 .gitignore 屏蔽 public/twemoji/）
 *   - 镜像构建只要能跑 pnpm install，就会自动把资产打进 public/，
 *     最终被 Next.js 静态服务（/twemoji/svg/<codepoint>.svg）
 *   - 全程不依赖公网 CDN，适合内网部署
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../node_modules/@twemoji/svg');
const DST = resolve(__dirname, '../public/twemoji/svg');

if (!existsSync(SRC)) {
  console.error(
    '[twemoji] @twemoji/svg not found at',
    SRC,
    '\n         请先运行 `pnpm install`',
  );
  process.exit(1);
}

// 已经复制过且数量一致就跳过，避免重复 IO
const sourceCount = readdirSync(SRC).filter(f => f.endsWith('.svg')).length;
if (existsSync(DST)) {
  const destCount = readdirSync(DST).filter(f => f.endsWith('.svg')).length;
  if (destCount === sourceCount && destCount > 0) {
    console.log(
      `[twemoji] ${destCount} svg files already present at public/twemoji/svg, skip`,
    );
    process.exit(0);
  }
}

mkdirSync(DST, { recursive: true });

// 只复制 .svg 文件，跳过 package.json / README
let copied = 0;
for (const name of readdirSync(SRC)) {
  if (!name.endsWith('.svg')) continue;
  const s = resolve(SRC, name);
  if (!statSync(s).isFile()) continue;
  cpSync(s, resolve(DST, name));
  copied += 1;
}

console.log(`[twemoji] copied ${copied} svg files → public/twemoji/svg/`);

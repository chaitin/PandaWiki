/**
 * PandaWiki SEO 静态页面生成脚本
 *
 * 用法：
 *   node scripts/generate-seo-pages.mjs
 *
 * 环境变量：
 *   TARGET            - 后端 API 地址，默认 http://panda-wiki-api:8000
 *   DEV_KB_ID         - 知识库 ID（可选，通过 x-kb-id header 传递）
 *   SEO_OUTPUT_DIR    - 输出目录，默认 ./seo-output/node
 *                       （本地开发可用 SEO_OUTPUT_DIR=./public/node 配合 Next.js dev server）
 *
 * 功能：
 *   1. 从后端 API 获取知识库配置（标题、描述、关键词等）
 *   2. 获取全部文档节点列表（支持多栏目）
 *   3. 逐个获取文档详情并渲染为静态 HTML
 *   4. 输出到指定目录，由 Nginx 或 Next.js public/ 直接提供
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

// ─── 配置 ───────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.TARGET || 'http://panda-wiki-api:8000';
const KB_ID = process.env.DEV_KB_ID || '';
const OUTPUT_DIR = path.resolve(
  process.env.SEO_OUTPUT_DIR || path.join(__dirname, '..', 'seo-output', 'node')
);

// HTTPS 自签名证书支持
if (API_BASE.startsWith('https://')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️  HTTPS 自签名证书模式：已跳过 TLS 证书校验');
}

// ─── Markdown 渲染器（与 tiptap 使用相同的 markdown-it） ──

const md = new MarkdownIt({
  html: true,         // 允许 HTML 标签
  linkify: true,      // 自动转换 URL 为链接
  typographer: true,  // 智能引号等排版优化
});

// ─── 工具函数 ───────────────────────────────────────────

/**
 * 发起 API 请求并解析 JSON 响应
 */
async function fetchApi(url) {
  const fullUrl = `${API_BASE}${url}`;
  console.log(`  [API] GET ${fullUrl}`);

  const headers = {};
  if (KB_ID) {
    headers['x-kb-id'] = KB_ID;
  }

  const res = await fetch(fullUrl, { headers });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} (${fullUrl})`);
  }

  const json = await res.json();

  // PandaWiki API 兼容两种响应格式：
  //   { code: 0, data: ... }  或  { success: true, data: ... }
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(`API error: code=${json.code}, message=${json.message || 'unknown'} (${fullUrl})`);
  }
  if (json.success !== undefined && !json.success) {
    throw new Error(`API error: message=${json.message || 'unknown'} (${fullUrl})`);
  }

  return json.data ?? json;
}

/**
 * 从节点列表提取所有文档节点 ID（type === 2）
 * 支持两种数据结构：
 *   - 扁平数组：[{id, type: 2}, {id, type: 1, children: [{id, type: 2}]}]
 *   - 树形结构：[{id, type: 1, children: [{id, type: 2}]}]
 */
function extractDocIds(nodes, ids = []) {
  if (!Array.isArray(nodes)) return ids;

  for (const node of nodes) {
    if (node.type === 2 && node.id) {
      ids.push(node.id);
    }
    // 同时检查嵌套 children（兼容树形结构）
    if (Array.isArray(node.children)) {
      extractDocIds(node.children, ids);
    }
  }
  return ids;
}

/**
 * HTML/XML 特殊字符转义
 */
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/** sitemap.xml 专用：只转义 XML 核心字符 */
function escapeXml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * 渲染文档内容为 HTML 字符串
 */
function renderContent(content, contentType) {
  if (!content) return '';
  if (contentType === 'md') {
    return md.render(content);
  }
  // HTML 格式直接输出
  return content;
}

/**
 * 生成单个文档的完整 HTML 页面
 */
function buildHtmlPage(node, kbDetail) {
  const siteTitle = kbDetail?.settings?.title || 'PandaWiki';
  const pageTitle = node.name || '未命名文档';
  const description = node.meta?.summary || kbDetail?.settings?.desc || '';
  const keywords = kbDetail?.settings?.keyword || '';
  const fullTitle = `${pageTitle} - ${siteTitle}`;
  const bodyHtml = renderContent(node.content, node.meta?.content_type || 'html');
  const updatedAt = node.updated_at || node.created_at || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(kbDetail?.base_url || '')}/node/${encodeURIComponent(node.id || '')}.html">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(siteTitle)}">
  ${updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(updatedAt)}">` : ''}
  <style>
    body {
      max-width: 860px;
      margin: 0 auto;
      padding: 24px 20px 60px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      background: #fff;
    }
    h1 { font-size: 2em; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; margin: 0.75em 0 0.5em; }
    h3 { font-size: 1.25em; margin: 0.83em 0 0.5em; }
    h4, h5, h6 { margin: 1em 0 0.5em; }
    p { margin: 0.8em 0; }
    pre {
      background: #f5f5f5;
      padding: 16px;
      overflow-x: auto;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.5;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #666;
      background: #f9f9f9;
    }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { padding-left: 2em; }
    li { margin: 0.3em 0; }
    hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(pageTitle)}</h1>
    ${bodyHtml}
  </main>
</body>
</html>`;
}

// ─── 获取所有文档 ID ───────────────────────────────────

async function getAllDocIds() {
  console.log('\n📋 获取文档列表...');
  const nodeListData = await fetchApi('/share/v1/node/list');

  // 多栏目（grouped）模式：{ is_grouped: true, nav_data_map: { nav_id: [...] } }
  if (nodeListData && typeof nodeListData === 'object' && !Array.isArray(nodeListData) && nodeListData.is_grouped) {
    const { nav_data_map, nav_list } = nodeListData;
    console.log(`  检测到多栏目模式，共 ${nav_list?.length || 0} 个栏目`);
    const allIds = [];
    for (const navId of Object.keys(nav_data_map || {})) {
      extractDocIds(nav_data_map[navId], allIds);
    }
    const ids = [...new Set(allIds)];
    console.log(`  共找到 ${ids.length} 个文档`);
    return ids;
  }

  // 扁平列表模式（含可能的嵌套 children）
  if (Array.isArray(nodeListData)) {
    const ids = extractDocIds(nodeListData);
    console.log(`  共找到 ${ids.length} 个文档`);
    return ids;
  }

  console.log('  ⚠️  无法解析文档列表，返回空数组');
  return [];
}

// ─── 主流程 ─────────────────────────────────────────────

async function main() {
  console.log('🚀 PandaWiki SEO 静态页面生成器');
  console.log(`   API: ${API_BASE}`);
  console.log(`   输出: ${OUTPUT_DIR}`);

  // 1. 获取知识库配置
  console.log('\n⚙️  获取知识库配置...');
  let kbDetail = {};
  try {
    kbDetail = await fetchApi('/share/v1/app/web/info');
    console.log(`   站点名称: ${kbDetail?.settings?.title || '未设置'}`);
  } catch (err) {
    console.warn(`   ⚠️  获取配置失败: ${err.message}，使用默认值`);
  }

  // 2. 获取所有文档 ID
  const docIds = await getAllDocIds();

  if (docIds.length === 0) {
    console.log('\n⚠️  没有找到任何文档，退出');
    return;
  }

  // 3. 创建输出目录
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 4. 逐个获取文档详情并生成 HTML
  console.log('\n📝 生成静态 HTML...');
  let successCount = 0;
  let failCount = 0;
  const failedIds = [];

  for (let i = 0; i < docIds.length; i++) {
    const docId = docIds[i];
    const progress = `[${i + 1}/${docIds.length}]`;

    try {
      const node = await fetchApi(`/share/v1/node/detail?id=${encodeURIComponent(docId)}&format=json`);

      if (!node || !node.content) {
        console.log(`  ${progress} ⏭️  ${docId} — 无内容，跳过`);
        continue;
      }

      const html = buildHtmlPage(node, kbDetail);
      const filePath = path.join(OUTPUT_DIR, `${docId}.html`);

      // 如果文件内容没变化，跳过写入
      if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf-8') === html) {
        console.log(`  ${progress} ⏭️  ${docId}.html — 无变化，跳过`);
        successCount++;
        continue;
      }

      fs.writeFileSync(filePath, html, 'utf-8');
      const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
      console.log(`  ${progress} ✅ ${docId}.html (${sizeKB} KB)`);
      successCount++;
    } catch (err) {
      console.error(`  ${progress} ❌ ${docId} — ${err.message}`);
      failCount++;
      failedIds.push(docId);
    }
  }

  // 5. 输出统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 生成统计');
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log(`   输出: ${OUTPUT_DIR}`);
  if (failedIds.length > 0) {
    console.log(`   失败列表: ${failedIds.join(', ')}`);
  }
  console.log('='.repeat(50));

  // 生成 sitemap.txt（纯文本，每行一个 URL）
  const baseUrl = kbDetail?.base_url || '';
  const sitemapTxtPath = path.join(OUTPUT_DIR, 'sitemap.txt');
  const urls = docIds.map((id) => `${baseUrl}/node/${id}.html`);
  fs.writeFileSync(sitemapTxtPath, urls.join('\n'), 'utf-8');
  console.log(`📄 sitemap.txt: ${sitemapTxtPath}`);

  // 生成 sitemap.xml（标准 XML 格式）
  const sitemapXmlPath = path.join(OUTPUT_DIR, 'sitemap.xml');
  const xmlEntries = docIds
    .map(
      (id) => `  <url>
    <loc>${escapeXml(`${baseUrl}/node/${id}.html`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
  fs.writeFileSync(sitemapXmlPath, sitemapXml, 'utf-8');
  console.log(`📄 sitemap.xml: ${sitemapXmlPath}`);
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err);
  process.exit(1);
});

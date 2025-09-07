import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const dirname = path.dirname(fileURLToPath(import.meta.url));

async function downloadAndExtractSVGs(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const svgString = await response.text();
    extractSVGs(svgString);
  } catch (error) {
    console.error('Failed to fetch SVG string:', error);
  }
}

const toCamelCase = str => {
  return str
    .replace(/-./g, match => match.charAt(1).toUpperCase())
    .replace(/^./, match => match.toUpperCase());
};

const extractSVGs = async svgString => {
  const svgMatch = svgString.match(
    /window\._iconfont_svg_string_.*?'(<svg>.*<\/svg>)'/,
  );

  const prettierConfig = await prettier.resolveConfig(
    path.resolve(dirname, '../../../prettier.config.js'),
  );

  if (!svgMatch || !svgMatch[1]) {
    console.error('无法提取SVG字符串。请检查输入是否正确。');
    return;
  }

  const svgSpriteString = svgMatch[1];

  const symbolRegex =
    /<symbol\s+id="([^"]+)"\s+viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g;

  let match;
  const icons: { id: string; viewBox: string; content: string }[] = [];

  while ((match = symbolRegex.exec(svgSpriteString)) !== null) {
    const [fullMatch, id, viewBox, content] = match;
    icons.push({ id, viewBox, content });
  }

  for (const icon of icons) {
    const { id, viewBox, content } = icon;
    const formattedName = toCamelCase(id);
    const fileName = `${formattedName}.tsx`;

    // 生成 React/JSX 组件代码
    const reactComponentCode = `import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

const ${formattedName} = (props: SvgIconProps) => (
  <SvgIcon
    xmlns='http://www.w3.org/2000/svg'
    viewBox='${viewBox}'
    {...props}
  >
    ${content}
  </SvgIcon>
);

${formattedName}.displayName = '${id}';

export default ${formattedName};`;
    const targetDir = path.resolve(dirname, '../src');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const prettierCode = await prettier.format(reactComponentCode, {
      parser: 'typescript',
      ...prettierConfig,
    });
    fs.writeFileSync(path.resolve(targetDir, fileName), prettierCode);
  }
};

async function start(url) {
  await downloadAndExtractSVGs(url);
  const srcDirname = path.resolve(dirname, '../src');
  const fileNames = fs.readdirSync(srcDirname);
  const newIndexContent = fileNames
    .map(fileName => {
      if (fileName === 'index.tsx') {
        return '';
      }
      return `export { default as ${path.basename(fileName, '.tsx')} } from './${fileName}';`;
    })
    .join('\n');
  fs.writeFileSync(path.resolve(srcDirname, 'index.tsx'), newIndexContent);

  console.log('Generate Icon Success');
}

let argument = process.argv.splice(2);

if (!argument[0]) {
  console.error('请输入 iconfont 的URL');
  process.exit(1);
}

start(argument[0]?.includes('http') ? argument[0] : `https:${argument[0]}`);

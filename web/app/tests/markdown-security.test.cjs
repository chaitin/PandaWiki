// Run with: node --test tests/markdown-security.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const MarkdownIt = require('markdown-it');

// Exercise the production renderer rules without mounting the surrounding UI.
function loadFunction(relativePath, name, callback = false) {
  const file = path.join(__dirname, '..', 'src', relativePath);
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
      expression = callback ? node.initializer.arguments[0] : node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(expression, `Missing production function: ${name}`);
  const code = ts.transpileModule(`(${expression.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return vm.runInNewContext(code, {
    theme: { palette: { primary: { main: '#000' } } },
    getImagePath: value => value,
    renderImage: () => '<div class="image-placeholder"></div>',
    renderMermaid: () => '<div class="mermaid-placeholder"></div>',
    renderThinking: value => new MarkdownIt().utils.escapeHtml(value),
  });
}

const configure = loadFunction(
  'components/markdown2/index.tsx',
  'customizeRenderer',
  true,
);
const split = loadFunction(
  'components/QaModal/utils.ts',
  'handleThinkingContent',
);
function render(content) {
  const md = new MarkdownIt({ html: true });
  configure(md);
  return md.render(split(content).answerContent);
}

for (const payload of [
  'answer <iframe data-note="</think>" srcdoc="<script>parent.__xss=1</script>"></iframe>',
  'answer <iframe data-note="</think>" srcdoc="&lt;script&gt;parent.__xss=1&lt;/script&gt;"></iframe>',
  'answer <svg data-note="</think>" onload="parent.__xss=1"></svg>',
  '<iframe srcdoc="<script>parent.__xss=1</script>"></iframe>',
  'answer <img src="/ok.png"><iframe data-note="</think>" srcdoc="<script>parent.__xss=1</script>"></iframe>',
]) {
  test(`escapes active HTML from shared answers: ${payload}`, () => {
    const html = render(payload);
    assert.doesNotMatch(html, /<(?:iframe|svg|script)\b/i);
    assert.match(html, /&lt;(?:iframe|svg)\b/i);
  });
}

test('preserves supported Markdown and custom rendering', () => {
  assert.match(render('**bold**'), /<strong>bold<\/strong>/);
  assert.match(
    render('[link](https://example.com)'),
    /href="https:\/\/example.com"/,
  );
  assert.match(render('`<iframe>`'), /<code[^>]*>&lt;iframe&gt;<\/code>/);
  assert.match(render('![alt](/image.png)'), /image-placeholder/);
  assert.match(render('<img src="/image.png">'), /image-placeholder/);
  assert.match(
    render('<error>failed</error>'),
    /<span class="chat-error">failed<\/span>/,
  );
  assert.match(
    render('```mermaid\ngraph TD; A-->B\n```'),
    /mermaid-placeholder/,
  );
});

test('escapes decoded quotes in Markdown link attributes', () => {
  const html = render(
    '[link](<https://example.com/\u0022\u0020onmouseover=\u0022alert(1)>)',
  );
  assert.doesNotMatch(html, /href="[^"]*" onmouseover=/);
});

test('renders image attributes containing quoted angle brackets', () => {
  for (const tag of [
    '<img src="/image.png" alt="a > b">',
    "<img src='/image.png' alt='a > b' />",
    '<img src="/image.png" alt="<iframe>">',
  ]) {
    assert.match(render(tag), /image-placeholder/);
    assert.match(render(`answer ${tag}`), /image-placeholder/);
  }
});

test('does not accept extra tags after an image with quoted angle brackets', () => {
  const html = render(
    '<img src="/image.png" alt="a > b"><iframe srcdoc="evil"></iframe>',
  );
  assert.doesNotMatch(html, /<iframe\b/i);
  assert.match(html, /&lt;iframe\b/i);
});

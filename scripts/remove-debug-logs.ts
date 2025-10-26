import path from 'node:path';
import { Project, Node, QuoteKind } from 'ts-morph';

const ROOT = path.resolve(__dirname, '..');

const project = new Project({
  tsConfigFilePath: path.join(ROOT, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
  manipulationSettings: { quoteKind: QuoteKind.Single },
});

const includeGlobs = [
  'src/**/*.{ts,tsx,js,jsx}',
  'functions/**/*.{ts,tsx,js,jsx}',
  'electron/**/*.{ts,tsx,js,jsx}',
];

includeGlobs.forEach((g) => project.addSourceFilesAtPaths(path.join(ROOT, g)));

const EXCLUDE_DIR_SEGMENTS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}out${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}build${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}public${path.sep}`,
  `${path.sep}HS-Mobile${path.sep}`,
];

const isTargetConsole = (call: import('ts-morph').CallExpression) => {
  const exp = call.getExpression();
  if (!Node.isPropertyAccessExpression(exp)) return false;
  const obj = exp.getExpression().getText();
  const prop = exp.getName();
  return obj === 'console' && (prop === 'log' || prop === 'debug');
};

let removed = 0;
project.getSourceFiles().forEach((sf) => {
  const filePath = sf.getFilePath();
  const posixPath = filePath.replace(/\\/g, '/');
  const EXCLUDES_POSIX = [
    '/node_modules/',
    '/out/',
    '/dist/',
    '/build/',
    '/.next/',
    '/public/',
    '/HS-Mobile/',
  ];
  if (EXCLUDES_POSIX.some((seg) => posixPath.includes(seg))) return;

  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    if (!isTargetConsole(node)) return;

    const parent = node.getParent();
    if (Node.isExpressionStatement(parent)) {
      parent.remove();
      removed += 1;
      return;
    }

    // 표현식 내부인 경우: undefined와 동등한 값으로 치환하여 표현식 구조 보존
    node.replaceWithText('void 0');
    removed += 1;
  });
});

project.saveSync();
// eslint-disable-next-line no-console
console.log(`[remove-debug-logs] console.log/debug removed or replaced: ${removed}`);



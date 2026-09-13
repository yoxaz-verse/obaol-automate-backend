import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const sourceRoot = process.argv[2] || "src";
const supported = new Set([".js", ".jsx", ".ts", ".tsx"]);
const files = [];

const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (supported.has(extname(entry.name))) files.push(path);
  }
};

walk(sourceRoot);

const details = files.map((file) => {
  const source = readFileSync(file, "utf8");
  return {
    file,
    lines: source.split(/\r?\n/).length,
    anyReferences: (source.match(/\bany\b/g) || []).length,
    consoleCalls: (source.match(/console\.(?:log|debug|info|warn|error)/g) || []).length,
    clientComponent: /^[\s]*["']use client["'];/m.test(source),
  };
});

const sum = (key) => details.reduce((total, item) => total + Number(item[key] || 0), 0);
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  files: details.length,
  lines: sum("lines"),
  anyReferences: sum("anyReferences"),
  consoleCalls: sum("consoleCalls"),
  clientComponents: details.filter((item) => item.clientComponent).length,
  filesOver500Lines: details.filter((item) => item.lines > 500).length,
  largestFiles: [...details]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map(({ file, lines }) => ({ file, lines })),
};

console.log(JSON.stringify(report, null, 2));


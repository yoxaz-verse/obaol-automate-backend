import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const sourceRoot = process.argv[2] || "src";
const shouldCheck = process.argv.includes("--check");
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
    explicitAny: (source.match(/(?::|<|\bas)\s*any\b/g) || []).length,
    consoleCalls: (source.match(/console\.(?:log|debug|info|warn|error)/g) || []).length,
    directAxiosErrorParsing: (source.match(/\.response\??\.data\b/g) || []).length,
    duplicatedErrorResponses: (source.match(/res\.status\([^\n]+\)\.json\(/g) || []).length,
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
  explicitAny: sum("explicitAny"),
  consoleCalls: sum("consoleCalls"),
  directAxiosErrorParsing: sum("directAxiosErrorParsing"),
  duplicatedErrorResponses: sum("duplicatedErrorResponses"),
  clientComponents: details.filter((item) => item.clientComponent).length,
  filesOver500Lines: details.filter((item) => item.lines > 500).length,
  largestFiles: [...details]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map(({ file, lines }) => ({ file, lines })),
};

console.log(JSON.stringify(report, null, 2));

if (shouldCheck) {
  const budgetPath = resolve("code-health-budget.json");
  if (!existsSync(budgetPath)) throw new Error(`Missing code-health budget: ${budgetPath}`);
  const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
  const checks = {
    filesOver500Lines: budget.maxFilesOver500Lines,
    explicitAny: budget.maxExplicitAny,
    directAxiosErrorParsing: budget.maxDirectAxiosErrorParsing,
    duplicatedErrorResponses: budget.maxDuplicatedErrorResponses,
    consoleCalls: budget.maxConsoleCalls,
  };
  const failures = Object.entries(checks)
    .filter(([, maximum]) => Number.isFinite(maximum))
    .filter(([metric, maximum]) => Number(report[metric]) > Number(maximum))
    .map(([metric, maximum]) => `${metric}: ${report[metric]} exceeds ${maximum}`);
  if (failures.length) {
    console.error(`Code-health budget failed:\n${failures.join("\n")}`);
    process.exitCode = 1;
  }
}


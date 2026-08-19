#!/usr/bin/env node
/**
 * 注册插件到平台:
 *  - features/index.ts   加 import + 数组项
 *  - src/db/index.ts     合并插件 schema
 * 用法: node register.mjs <平台目录>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const platform = process.argv[2];
if (!platform) {
  console.error("用法: node register.mjs <平台目录>");
  process.exit(1);
}
const name = "yuketang";

// ---- features/index.ts ----
const indexPath = join(platform, "features", "index.ts");
let index = readFileSync(indexPath, "utf8");
const importLine = `import { ${name} } from "./${name}/manifest";`;
if (!index.includes(importLine)) {
  const lines = index.split("\n");
  // 在最后一个 manifest import 后插入
  let lastImport = -1;
  lines.forEach((l, i) => {
    if (l.startsWith("import ") && l.includes("/manifest")) lastImport = i;
  });
  if (lastImport === -1) {
    console.error("features/index.ts 未找到 manifest import,请手动检查");
    process.exit(1);
  }
  lines.splice(lastImport + 1, 0, importLine);
  // 解析并重建 features 数组
  const arrIdx = lines.findIndex((l) => l.includes("export const features = ["));
  if (arrIdx !== -1) {
    const start = lines[arrIdx].indexOf("[") + 1;
    const end = lines[arrIdx].lastIndexOf("]");
    const items = lines[arrIdx]
      .slice(start, end)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.includes(name)) items.push(name);
    lines[arrIdx] = `export const features = [${items.join(", ")}];`;
  }
  writeFileSync(indexPath, lines.join("\n"));
  console.log(`  features/index.ts: 已注册 ${name}`);
} else {
  console.log(`  features/index.ts: ${name} 已存在,跳过`);
}

// ---- src/db/index.ts ----
const dbPath = join(platform, "src", "db", "index.ts");
const dbSrc = readFileSync(dbPath, "utf8");
const schemaImport = `import * as ${name}Schema from "../../features/${name}/schema";`;
if (!dbSrc.includes(schemaImport)) {
  const lines = dbSrc.split("\n");
  // 在最后一个 schema import 后插入
  let lastImport = -1;
  lines.forEach((l, i) => {
    if (l.startsWith("import * as ") && l.includes("/schema")) lastImport = i;
  });
  if (lastImport === -1) {
    console.error("src/db/index.ts 未找到 schema import,请手动检查");
    process.exit(1);
  }
  lines.splice(lastImport + 1, 0, schemaImport);
  // 在 schema: { ... } 展开对象里追加
  const schemaIdx = lines.findIndex((l) => l.includes("schema: {"));
  if (schemaIdx === -1) {
    console.error("src/db/index.ts 未找到 schema: {,请手动检查");
    process.exit(1);
  }
  // 找该行及其后续行直到闭合括号,把展开项合并到一行
  let acc = lines[schemaIdx];
  let j = schemaIdx + 1;
  while (!acc.includes("}") && j < lines.length) {
    acc += " " + lines[j];
    j++;
  }
  const spread = `...${name}Schema`;
  if (!acc.includes(spread)) {
    acc = acc.replace(/\s*\}\s*$/, " " + spread + " }");
    lines.splice(schemaIdx, j - schemaIdx, acc);
  }
  writeFileSync(dbPath, lines.join("\n"));
  console.log(`  src/db/index.ts: 已合并 ${name} schema`);
} else {
  console.log(`  src/db/index.ts: ${name} schema 已存在,跳过`);
}

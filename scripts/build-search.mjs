import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as pagefind from 'pagefind';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inventory = readJSON(path.join(root, 'docs/seo-inventory.json'));
const expected = inventory.filter(p => p.key !== 'search').sort((a, b) => a.path.localeCompare(b.path, 'en'));
const output = path.join(dist, 'pagefind');
// Even a standalone index rebuild must remove obsolete fragments and languages.
fs.rmSync(output, { recursive: true, force: true });
fs.rmSync(path.join(dist, 'search-manifest.json'), { force: true });
const requireSuccess = response => {
  if (response.errors?.length) throw new Error(response.errors.join('\n'));
  return response;
};
try {
  const { index } = requireSuccess(await pagefind.createIndex({ writePlayground: false }));
  assert(index, 'Pagefind failed to initialize');
  const pages = [];
  for (const item of expected) {
    const html = fs.readFileSync(path.join(dist, item.path, 'index.html'), 'utf8');
    assert(html.includes(' data-pagefind-body'), `Missing searchable main content: ${item.path}`);
    const { file } = requireSuccess(await index.addHTMLFile({ url: item.path, content: html }));
    assert(file, `Pagefind did not index ${item.path}`);
    pages.push({ path: item.path, language: item.language, html_sha256: sha(html) });
  }
  requireSuccess(await index.writeFiles({ outputPath: output }));
  // Pagefind's entry map order can vary across platforms. Normalize JSON
  // before hashing so freshness checks compare content rather than key order.
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const entryPath = path.join(output, 'pagefind-entry.json');
  const entry = readJSON(entryPath);
  entry.include_characters?.sort();
  fs.writeFileSync(entryPath, JSON.stringify(canonical(entry)));
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
  const files = Object.fromEntries(walk(output).sort().map(p => [path.relative(output, p).split(path.sep).join('/'), sha(fs.readFileSync(p))]));
  const version = readJSON(path.join(root, 'node_modules/pagefind/package.json')).version;
  fs.writeFileSync(path.join(dist, 'search-manifest.json'), JSON.stringify({ version, pages, files }, null, 2) + '\n');
  console.log(`Search indexed ${pages.length} published pages in English and Spanish (Pagefind ${version}).`);
} finally {
  await pagefind.close();
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = json(path.join(dist, 'search-manifest.json'));
assert.equal(manifest.version, json(path.join(root, 'package.json')).dependencies.pagefind, 'Search dependency version mismatch');
const expected = json(path.join(root, 'docs/seo-inventory.json')).filter(p => p.key !== 'search');
assert.deepEqual(manifest.pages.map(p => p.path).sort(), expected.map(p => p.path).sort(), 'Search coverage differs from published pages');
for (const page of manifest.pages) {
  assert.equal(page.language, expected.find(p => p.path === page.path).language);
  assert.equal(page.html_sha256, sha(fs.readFileSync(path.join(dist, page.path, 'index.html'))), `Stale search content: ${page.path}`);
}
const output = path.join(dist, 'pagefind');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const p = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(p) : [path.relative(output, p).split(path.sep).join('/')];
});
assert.deepEqual(walk(output).sort(), Object.keys(manifest.files).sort(), 'Search files are missing or obsolete');
assert(manifest.files['pagefind.js'] && manifest.files['pagefind-entry.json'], 'Search runtime is missing');
for (const [file, digest] of Object.entries(manifest.files)) {
  assert.equal(sha(fs.readFileSync(path.join(output, file))), digest, `Damaged search file: ${file}`);
}
const entry = json(path.join(output, 'pagefind-entry.json'));
const locales = json(path.join(root, 'content/locales.json'));
assert.deepEqual(Object.keys(entry.languages).sort(), Object.values(locales).map(l => l.lang.toLowerCase()).sort(), 'Missing English or Spanish search index');
for (const code of ['en', 'es']) {
  assert.equal(entry.languages[locales[code].lang.toLowerCase()].page_count, expected.filter(p => p.language === code).length, `Wrong index size: ${code}`);
}
console.log('Search integrity passed: current pages, complete language indexes, and matching runtime files.');

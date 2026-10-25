const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');
const root = path.resolve(__dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const locales = readJSON(root + '/content/locales.json');
const inventory = readJSON(root + '/docs/seo-inventory.json');
const samples = Object.fromEntries(['en','es'].map(code => {
  const item=inventory.find(p=>p.language===code && !Object.hasOwn(locales[code].routes,p.key)) || inventory.find(p=>p.language===code && p.key==='resources');
  const d=new JSDOM(fs.readFileSync(path.join(root,'dist',item.path,'index.html'),'utf8'));
  const doc=d.window.document;
  const title=doc.querySelector('h1').textContent.toLowerCase();
  const paragraphs=[...doc.querySelectorAll('main p')].filter(p=>!p.closest('[data-pagefind-ignore]'));
  const words=paragraphs.map(p=>p.textContent).join(' ').match(/\p{L}{7,}/gu)||[];
  const query=words.filter(w=>!title.includes(w.toLowerCase())).sort((a,b)=>b.length-a.length)[0] || doc.querySelector('h1').textContent;
  d.window.close();
  return [code,{path:item.path,query}];
}));
const checks = [];
const run = (args, cwd = root) => cp.spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
const verify = () => run(['scripts/verify-search.mjs']);
const expectFailure = (result, label) => assert(result.status !== null && result.status !== 0, label + '\n' + result.stdout + result.stderr);

// This test is part of the already-required Website quality job, not an optional job.
const workflow = fs.readFileSync(root + '/.github/workflows/website-quality.yml', 'utf8');
assert(workflow.includes('name: Website quality') && workflow.includes('run: node qa/search.cjs'));
assert(!/continue-on-error: *true|paths-ignore:|\bif:/.test(workflow), 'Quality checks must not silently skip or allow failure');
assert(workflow.includes('run: npm ci --no-audit --no-fund'));
assert(workflow.includes('SEARCH_VERIFY_DEPLOYMENT: "1"'), 'CI must test the Cloudflare deployment too');
assert.equal(verify().status, 0, 'Search integrity must pass before browser checks');
const manifestPath = root + '/dist/search-manifest.json';
const manifestText = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestText);
const runtimePath = root + '/dist/pagefind/pagefind.js';
const runtime = fs.readFileSync(runtimePath);
try {
  fs.writeFileSync(runtimePath, 'broken runtime');
  expectFailure(verify(), 'Corrupt runtime must fail');
  fs.unlinkSync(runtimePath);
  expectFailure(verify(), 'Missing runtime must fail');
} finally { fs.writeFileSync(runtimePath, runtime); }
try {
  const broken = structuredClone(manifest);
  broken.pages.pop();
  fs.writeFileSync(manifestPath, JSON.stringify(broken));
  expectFailure(verify(), 'Incomplete page coverage must fail');
} finally { fs.writeFileSync(manifestPath, manifestText); }
const firstFile = path.join(root, 'dist', manifest.pages[0].path, 'index.html');
const firstHTML = fs.readFileSync(firstFile);
try {
  fs.appendFileSync(firstFile, '<!-- content changed after indexing -->');
  expectFailure(verify(), 'Stale index must fail');
} finally { fs.writeFileSync(firstFile, firstHTML); }
checks.push('Missing/corrupt runtime, incomplete coverage, and stale indexed content all fail validation.');

// Python uses recursively sorted keys for translation review signatures.
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-search-'));
let browser;
let server;
let currentDist = root + '/dist';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
async function allResults(page, code) {
  await page.goto(base + locales[code].routes.search);
  return page.evaluate(async () => {
    const engine = await import('/pagefind/pagefind.js');
    const response = await engine.search(null);
    return Promise.all(response.results.map(r => r.data()));
  });
}
async function userSearch(page, code, query) {
  const old = await page.locator('#search-status').textContent();
  await page.locator('#search-query').fill(query);
  await page.locator('#search-query').press('Enter');
  await page.waitForFunction(({loading,old}) => {
    const s = document.getElementById('search-status');
    return s.textContent && s.textContent !== loading && (s.textContent !== old || !document.getElementById('search-results').hasAttribute('aria-busy'));
  }, { loading: locales[code].ui.search_loading, old });
  assert.notEqual(await page.locator('#search-status').textContent(), locales[code].ui.search_error, 'Search failed');
}
let base;
(async () => {
  server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const candidate = path.resolve(currentDist, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!candidate.startsWith(path.resolve(currentDist) + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.writeHead(200, { 'Content-Type': mime[path.extname(candidate)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(candidate));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const code of ['en', 'es']) {
    const results = await allResults(page, code);
    const expected = inventory.filter(p => p.language === code && p.key !== 'search');
    assert.deepEqual(results.map(r => r.url).sort(), expected.map(p => p.path).sort(), 'Index must contain exactly the current published pages: ' + code);
    for (const item of expected) {
      const d = new JSDOM(fs.readFileSync(path.join(currentDist, item.path, 'index.html'), 'utf8'));
      const title = d.window.document.querySelector('h1').textContent;
      const result = results.find(r => r.url === item.path);
      assert.equal(result.meta.title, title, 'Search title must match the current page');
      assert.equal(result.meta.description, item.description);
      assert(!result.content.includes(locales[code].ui.footer_summary), 'Footer must not pollute results');
      const hits = await page.evaluate(async query => {
        const engine = await import('/pagefind/pagefind.js');
        return Promise.all((await engine.search(query)).results.map(r => r.data())).then(items => items.map(item => item.url));
      }, title);
      assert(hits.includes(item.path), 'Current page title must find its page: ' + item.path);
      d.window.close();
    }
    await userSearch(page, code, samples[code].query);
    assert(await page.locator('.search-results a[href="'+samples[code].path+'"]').count(), 'Current sample page must be found by its body text');
    assert(await page.locator('.search-results mark').count(), 'Relevant words should be highlighted');
    assert.equal(await page.locator('#search-query').evaluate(el => document.activeElement === el), true, 'Submitting must preserve input focus');
    assert.equal(await page.locator('#search-status').getAttribute('role'), 'status');
    const other = code === 'en' ? 'es' : 'en';
    assert.equal(new URL(await page.locator('.language-switcher a[hreflang="' + other + '"]').getAttribute('href'), base).searchParams.get('q'), samples[code].query);
    await page.addScriptTag({ content: axe.source });
    const accessibility = await page.evaluate(async () => (await axe.run(document, { runOnly: {type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']} })).violations);
    assert.deepEqual(accessibility.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], 'Rendered search accessibility violations');
    await userSearch(page, code, 'zznosuchsearchwordzz');
    assert.equal(await page.locator('#search-status').textContent(), locales[code].ui.search_empty);
    assert.equal(await page.locator('.search-results li').count(), 0);
    await page.goBack();
    await page.waitForFunction(p => document.querySelector('.search-results a[href="'+p+'"]'), samples[code].path);
    await page.goto(base + locales[code].routes.search + '?q='+encodeURIComponent(samples[code].query));
    await page.waitForFunction(p => document.querySelector('.search-results a[href="'+p+'"]'), samples[code].path);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Search must reflow at ' + width);
    }
    await page.addScriptTag({ content: axe.source });
    await page.emulateMedia({ colorScheme: 'dark' });
    const dark = await page.evaluate(async () => (await axe.run(document, {runOnly:{type:'rule',values:['color-contrast']}})).violations);
    assert.deepEqual(dark.map(v => ({id:v.id,nodes:v.nodes.map(n=>({target:n.target,detail:n.failureSummary}))})), [], 'Dark-mode search contrast');
    await page.emulateMedia({ colorScheme: 'light' });
  }
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  checks.push('Chromium: exact page coverage and metadata, both languages, full-text results, highlights, URL/history, focus, 320/390/1440px reflow, and rendered axe/contrast checks.');

  const failed = await context.newPage();
  await failed.route('**/pagefind/**', route => route.abort());
  await failed.goto(base + '/search/?q='+encodeURIComponent(samples.en.query));
  await failed.waitForFunction(message => document.getElementById('search-status').textContent === message, locales.en.ui.search_error);
  await failed.unroute('**/pagefind/**');
  await userSearch(failed, 'en', samples.en.query);
  assert(await failed.locator('.search-results a[href="'+samples.en.path+'"]').count());
  await failed.close();
  const failedData = await context.newPage();
  await failedData.route('**/pagefind/pagefind-entry.json*', route => route.abort());
  await failedData.goto(base + '/search/?q='+encodeURIComponent(samples.en.query));
  await failedData.waitForFunction(message => document.getElementById('search-status').textContent === message, locales.en.ui.search_error);
  await failedData.unroute('**/pagefind/pagefind-entry.json*');
  await userSearch(failedData, 'en', samples.en.query);
  assert(await failedData.locator('.search-results a[href="'+samples.en.path+'"]').count());
  await failedData.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJS.newPage();
  await fallback.goto(base + '/es/buscar/');
  assert(await fallback.locator('noscript').isVisible());
  assert.equal(await fallback.locator('noscript a').count(), 2);
  await noJS.close();
  checks.push('Network failure gives a readable error and retry succeeds; no-JavaScript visitors retain bilingual browsing links.');

  if (process.env.SEARCH_VERIFY_DEPLOYMENT === '1') {
    const {GITHUB_TOKEN,SEARCH_REPOSITORY,SEARCH_COMMIT}=process.env;
    assert(GITHUB_TOKEN && SEARCH_REPOSITORY && SEARCH_COMMIT, 'Deployment verification configuration is missing');
    let preview;
    for(let attempt=0;attempt<36;attempt++) {
      const response=await fetch(`https://api.github.com/repos/${SEARCH_REPOSITORY}/commits/${SEARCH_COMMIT}/check-runs`,{headers:{Authorization:`Bearer ${GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
      assert(response.ok,'Cannot read Cloudflare deployment status: '+response.status);
      const data=await response.json();
      const check=data.check_runs.filter(c=>c.name==='Cloudflare Pages').sort((a,b)=>b.id-a.id)[0];
      if(check?.status==='completed') {
        assert.equal(check.conclusion,'success','Cloudflare deployment must succeed');
        preview=check.output?.summary?.match(/https:\/\/[a-z0-9-]+\.elevate-access-website\.pages\.dev/)?.[0];
        assert(preview,'Cloudflare did not provide a preview URL');
        break;
      }
      await new Promise(resolve=>setTimeout(resolve,5000));
    }
    assert(preview,'Cloudflare deployment did not finish within three minutes');
    const origins=[preview];
    if(process.env.SEARCH_PRODUCTION==='true') origins.push(readJSON(root+'/config.json').origin);
    for(const origin of new Set(origins)) {
    const deployed=await context.newPage();
    for(const code of ['en','es']) {
      const response=await deployed.goto(origin+locales[code].routes.search);
      assert.equal(response.status(),200,'Deployed search page must load');
      const deployedManifest=await deployed.evaluate(async()=>{const r=await fetch('/search-manifest.json');if(!r.ok)throw new Error('Search manifest unavailable');return r.json()});
      assert.deepEqual(deployedManifest,manifest,'Deployed search files must match the tested build');
      const paths=await deployed.evaluate(async()=>{
        const engine=await import('/pagefind/pagefind.js');
        return Promise.all((await engine.search(null)).results.map(r=>r.data())).then(items=>items.map(item=>item.url).sort());
      });
      assert.deepEqual(paths,inventory.filter(p=>p.language===code && p.key!=='search').map(p=>p.path).sort(),'Deployed index must match the tested content');
      await userSearch(deployed,code,samples[code].query);
      assert(await deployed.locator('.search-results a[href="'+samples[code].path+'"]').count(),'Deployed full-text search must work');
    }
    await deployed.close();
    if(origin!==preview) checks.push('Production custom domain passes the same search page, manifest, coverage, and full-text query checks in both languages.');
    }
    checks.push('Cloudflare preview for the exact commit loads both search pages and returns the complete current indexes and working full-text results.');
  }

  // Exercise real publishing changes in a disposable source copy.
  for (const file of ['build.py','config.json','package.json','package-lock.json']) fs.copyFileSync(root + '/' + file, tmp + '/' + file);
  for (const dir of ['content','web','assets','scripts']) fs.cpSync(root + '/' + dir, tmp + '/' + dir, {recursive:true});
  fs.mkdirSync(tmp + '/docs');
  fs.symlinkSync(root + '/node_modules', tmp + '/node_modules', 'dir');
  const buildSearch = fs.readFileSync(tmp + '/scripts/build-search.mjs');
  fs.writeFileSync(tmp + '/scripts/build-search.mjs', 'throw new Error("Simulated indexing failure");');
  expectFailure(cp.spawnSync('python3', ['build.py'], {cwd:tmp,encoding:'utf8'}), 'Indexing failure must stop the website build');
  fs.writeFileSync(tmp + '/scripts/build-search.mjs', buildSearch);
  const verifySearch = fs.readFileSync(tmp + '/scripts/verify-search.mjs');
  fs.writeFileSync(tmp + '/scripts/verify-search.mjs', 'throw new Error("Simulated integrity failure");');
  expectFailure(cp.spawnSync('python3', ['build.py'], {cwd:tmp,encoding:'utf8'}), 'Integrity failure must stop the website build');
  fs.writeFileSync(tmp + '/scripts/verify-search.mjs', verifySearch);
  const sources = Object.fromEntries(['en','es'].map(code => [code,readJSON(tmp + '/content/site' + (code==='en'?'':'.es') + '.json')]));
  const oldURLs = {};
  for (const code of ['en','es']) {
    const article = sources[code].articles.find(a => a.status === 'published');
    oldURLs[code] = locales[code].routes.insights + article.slug + '/';
    article.translation_key ||= article.slug;
    article.slug = code === 'en' ? 'search-freshness-check' : 'verificacion-busqueda';
    delete article.body_file;
    article.body_html = '<p>zzfreshsearchmarkerzz ' + code + '</p>';
    sources[code].articles.push({...article, status:'draft',slug:'draft-search-check',translation_key:'draft-search-check',body_html:'<p>zzdraftsecretmarkerzz</p>'});
  }
  const saveSources = () => {
    const english = structuredClone(sources.en);delete english.source_note;english.articles=english.articles.filter(a=>a.status==='published');
    sources.es.translation_source_sha256=crypto.createHash('sha256').update(JSON.stringify(canonical(english))).digest('hex');
    for (const code of ['en','es']) fs.writeFileSync(tmp + '/content/site' + (code==='en'?'':'.es') + '.json',JSON.stringify(sources[code]));
  };
  saveSources();
  let build = cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
  assert.equal(build.status,0,build.stdout+build.stderr);
  currentDist = tmp + '/dist';
  for (const code of ['en','es']) {
    const indexed = await allResults(page,code);
    assert(!indexed.some(r=>r.url===oldURLs[code]));
    assert(!indexed.some(r=>r.content.includes('zzdraftsecretmarkerzz')));
    assert(indexed.some(r=>r.content.includes('zzfreshsearchmarkerzz')));
    await userSearch(page,code,'zzfreshsearchmarkerzz');
    assert.equal(await page.locator('.search-results li').count(),1);
  }
  for (const code of ['en','es']) {
    sources[code].articles.find(a=>a.slug.includes(code==='en'?'search-freshness':'verificacion')).status='draft';
    sources[code].articles.find(a=>a.slug==='draft-search-check').status='published';
  }
  saveSources();
  build=cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
  assert.equal(build.status,0,build.stdout+build.stderr);
  for (const code of ['en','es']) {
    const indexed=await allResults(page,code);
    assert(!indexed.some(r=>r.content.includes('zzfreshsearchmarkerzz')),'Unpublished content must disappear');
    assert(indexed.some(r=>r.content.includes('zzdraftsecretmarkerzz')),'Newly published content must appear automatically');
    await userSearch(page,code,'zzdraftsecretmarkerzz');
    assert.equal(await page.locator('.search-results li').count(),1);
  }
  for (const code of ['en','es']) {
    const seed={...sources[code].articles.find(a=>a.status==='published')};
    delete seed.body_file;
    for(let i=0;i<12;i++) sources[code].articles.push({...seed,slug:'pagination-check-'+i,translation_key:'pagination-check-'+i,title:(code==='en'?'Pagination check ':'Prueba de paginación ')+i,body_html:'<p>zzpaginationmarkerzz</p>'});
  }
  saveSources();
  build=cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
  assert.equal(build.status,0,build.stdout+build.stderr);
  for (const code of ['en','es']) {
    await page.goto(base+locales[code].routes.search);
    await userSearch(page,code,'zzpaginationmarkerzz');
    assert.equal(await page.locator('.search-results li').count(),10);
    assert(await page.locator('#search-more').isVisible());
    await page.locator('#search-more').click();
    await page.waitForFunction(()=>document.querySelectorAll('.search-results li').length===12);
    assert(await page.locator('#search-more').isHidden());
    assert(await page.evaluate(()=>!!document.activeElement.closest('.search-results')),'Loading more results must move focus to new results');
  }
  checks.push('A larger disposable archive returns 10 results at a time, loads the remaining results, and maintains keyboard focus in both languages.');
  checks.push('Disposable rebuilds prove indexing/integrity failures stop publication, newly published articles and edits become searchable, renamed URLs disappear, drafts stay excluded, and unpublishing removes content in both languages.');
  const report={searchChecks:checks,passed:true,limitations:'Automated Chromium and axe checks do not substitute for actual VoiceOver/NVDA usability testing.'};
  fs.writeFileSync(root+'/docs/search-qa.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(tmp,{recursive:true,force:true});
});

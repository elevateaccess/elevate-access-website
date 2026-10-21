const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {HtmlValidate}=require('html-validate');
const root=path.resolve(__dirname,'..');
const locales=JSON.parse(fs.readFileSync(root+'/content/locales.json','utf8'));
const inventory=JSON.parse(fs.readFileSync(root+'/docs/seo-inventory.json','utf8'));
const config=JSON.parse(fs.readFileSync(root+'/config.json','utf8'));
const source=Object.fromEntries(['en','es'].map(c=>[c,JSON.parse(fs.readFileSync(root+'/content/site'+(c==='en'?'':'.es')+'.json','utf8'))]));
const script=fs.readFileSync(root+'/web/site.js','utf8');
const css=fs.readFileSync(root+'/web/styles.css','utf8');
const validator=new HtmlValidate({extends:['html-validate:recommended'],rules:{'prefer-native-element':'off','no-inline-style':'error'}});
function read(route){return fs.readFileSync(root+'/dist/'+(route.endsWith('.html')?route.slice(1):route.replace(/^\//,'')+'index.html'),'utf8')}
function dom(route,execute=false){
 const d=new JSDOM(read(route),{url:config.origin+route,runScripts:'outside-only',pretendToBeVisual:true});
 d.window.matchMedia=()=>({matches:true,addEventListener(){}});
 if(execute)d.window.eval(script);
 return d;
}
function normalized(text){return text.replace(/\s+/g,' ').trim()}
function articleBody(a){return a.body_file?fs.readFileSync(root+'/'+a.body_file,'utf8'):a.body_html}
const checks=[];
(async()=>{
// Exercise the publication guards in an isolated copy; never mutate the live source.
const os=require('node:os'),cp=require('node:child_process');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'elevate-locale-'));
try{
 fs.copyFileSync(root+'/build.py',tmp+'/build.py');fs.copyFileSync(root+'/config.json',tmp+'/config.json');fs.cpSync(root+'/content',tmp+'/content',{recursive:true});
 const changed=JSON.parse(JSON.stringify(source.en));changed.about.mission+=' Changed source.';
 fs.writeFileSync(tmp+'/content/site.json',JSON.stringify(changed));
 let run=cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
 assert.notEqual(run.status,0);assert(run.stderr.includes('content translation to match'),'Stale content must fail clearly');assert(!fs.existsSync(tmp+'/dist'));
 fs.copyFileSync(root+'/content/site.json',tmp+'/content/site.json');
 const changedUI=JSON.parse(JSON.stringify(locales));changedUI.en.ui.menu='Changed menu';fs.writeFileSync(tmp+'/content/locales.json',JSON.stringify(changedUI));
 run=cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
 assert.notEqual(run.status,0);assert(run.stderr.includes('interface translation to match'));assert(!fs.existsSync(tmp+'/dist'));
 fs.copyFileSync(root+'/content/locales.json',tmp+'/content/locales.json');
 const missing=JSON.parse(JSON.stringify(source.es));missing.articles[0].status='draft';fs.writeFileSync(tmp+'/content/site.es.json',JSON.stringify(missing));
 run=cp.spawnSync('python3',['build.py'],{cwd:tmp,encoding:'utf8'});
 assert.notEqual(run.status,0);assert(run.stderr.includes('matching translation'));assert(!fs.existsSync(tmp+'/dist'));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
checks.push('Build rejects stale content, stale interface translations, and unmatched published articles before writing generated output.');
const published=Object.fromEntries(['en','es'].map(code=>[code,source[code].articles.filter(a=>a.status==='published')]));
const expectedPages=Object.keys(locales).reduce((total,code)=>total+Object.keys(locales[code].routes).length+published[code].length,0);
assert.equal(inventory.length,expectedPages);
assert.deepEqual(Object.keys(locales.en.ui).sort(),Object.keys(locales.es.ui).sort());
for(const key of Object.keys(locales.en.ui)){
 const slots=s=>[...s.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]).sort();
 assert.deepEqual(slots(locales.en.ui[key]),slots(locales.es.ui[key]),'Translation placeholders: '+key);
 assert(locales.es.ui[key].trim(),'Empty Spanish string: '+key);
}
assert.deepEqual(source.en.business,source.es.business);
assert.deepEqual(source.en.founders.map(f=>f.name),source.es.founders.map(f=>f.name));
assert.deepEqual(source.en.services.map(s=>s.id),source.es.services.map(s=>s.id));
assert(source.es.founders[0].paragraphs.join(' ').includes('Desde 2023'));
assert(source.es.founders[0].paragraphs.join(' ').includes('15 años'));
assert(source.es.founders[0].paragraphs.join(' ').includes('12 años'));
assert(source.es.founders[1].paragraphs.join(' ').includes('siete años'));
checks.push('All '+Object.keys(locales.en.ui).length+' interface keys and placeholders match; identity, contacts, service IDs, names, experience, and 2023 certification retained.');
let linkedPairs=0;
for(const item of inventory){
 const d=dom(item.path),doc=d.window.document;
 assert.equal(doc.documentElement.lang,locales[item.language].lang);
 assert.equal(doc.querySelector('.skip-link').textContent,locales[item.language].ui.skip);
 assert.equal(doc.querySelector('meta[property="og:locale"]').content,locales[item.language].og_locale);
 const languages=doc.querySelector('.language-switcher');
 assert(languages.closest('header'));
 assert(!languages.closest('#site-navigation'),'Switcher must remain outside collapsed menu');
 const variants=[...doc.querySelectorAll('head link[rel="alternate"][hreflang]')];
 assert.equal(variants.length,3);
 for(const code of ['en','es']){
  const a=languages.querySelector('a[hreflang="'+code+'"]');
  assert.equal(a.getAttribute('href'),item.alternates[code]);
  assert.equal(a.lang,code);
  assert.equal(a.textContent,locales[code].name);
  assert.equal(a.getAttribute('aria-current'),code===item.language?'true':null);
  assert.equal(doc.querySelector('head link[hreflang="'+code+'"]').href,config.origin+item.alternates[code]);
  const other=dom(item.alternates[code]);
  assert.equal(other.window.document.querySelector('.language-switcher a[hreflang="'+item.language+'"]').getAttribute('href'),item.path,'Language switch must return to corresponding page');
  assert.equal(other.window.document.querySelector('link[rel="canonical"]').href,config.origin+item.alternates[code]);
  const ids=el=>[...el.querySelectorAll('[id]')].map(e=>e.id).sort();
  assert.deepEqual(ids(doc),ids(other.window.document),'Paired sections must have stable IDs');
  other.window.close();linkedPairs++;
 }
 assert.equal(doc.querySelector('head link[hreflang="x-default"]').href,config.origin+item.alternates.en);
 for(const a of doc.querySelectorAll('a[href^="/"]')){
  if(a.closest('.language-switcher'))continue;
  assert.equal(a.getAttribute('href').startsWith('/es/'),item.language==='es','Navigation language leak: '+a.outerHTML);
 }
 const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
 assert.equal(graph.find(x=>x['@type']==='WebPage').inLanguage,locales[item.language].lang);
 assert(!doc.querySelector('form'));
 if(item.language==='es'){
  const text=doc.querySelector('main').textContent;
  for(const phrase of ['Our services','Meet the founders','Contact information','Skip to main content','Sources checked','Figure 1.','By Elevate Access'])assert(!text.includes(phrase),'English interface leak: '+phrase);
 }
 d.window.close();
}
checks.push('All '+inventory.length+' pages: native reciprocal language links, current-language names, stable section IDs, localized navigation/metadata, self-canonicals, en/es/x-default hreflang, structured-data language.');
for(const code of ['en','es']){
 const route=locales[code].routes.services;
 const d=dom(route,true),w=d.window,b=w.document.querySelector('.menu-toggle'),nav=w.document.querySelector('#site-navigation');
 assert(b.compareDocumentPosition(nav)&w.Node.DOCUMENT_POSITION_FOLLOWING,'Menu button must precede the revealed links in keyboard order');
 assert.equal(b.textContent,locales[code].ui.menu);
 b.click();assert.equal(b.textContent,locales[code].ui.close_menu);assert.equal(b.getAttribute('aria-expanded'),'true');assert(nav.classList.contains('is-open'));
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(b.textContent,locales[code].ui.menu);assert.equal(b.getAttribute('aria-expanded'),'false');assert.equal(w.document.activeElement,b);
 w.location.hash='#training';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 for(const a of w.document.querySelectorAll('.language-switcher a'))assert.equal(new URL(a.href).hash,'#training');
 w.location.hash='#does-not-exist';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 for(const a of w.document.querySelectorAll('.language-switcher a'))assert.equal(new URL(a.href).hash,'');
 d.window.close();
 for(const [key,paragraphs] of [['services',source[code].services.map(s=>s.description)],['founders',source[code].founders.flatMap(f=>f.paragraphs)]]){
  const d=dom(locales[code].routes[key]);const text=d.window.document.querySelector('main').textContent;
  for(const paragraph of paragraphs)assert(text.includes(paragraph));
  for(const portrait of d.window.document.querySelectorAll('.founder-portrait'))assert(source[code].founders.some(f=>f.portrait.alt===portrait.alt));
  d.window.close();
 }
}
assert(css.includes('@media(max-width:80rem)')&&script.includes('(max-width: 80rem)'),'JS/CSS menu breakpoint mismatch');
checks.push('Both mobile menus: translated open/close labels, expanded state, Escape/focus restoration, section-anchor preservation; source bios/services and portrait alternatives match. Emulated DOM only.');
const articleMap=Object.fromEntries(['en','es'].map(code=>[code,new Map(published[code].map(a=>[a.translation_key||a.slug,a]))]));
assert.deepEqual([...articleMap.en.keys()].sort(),[...articleMap.es.keys()].sort(),'Every published article needs a reviewed translation');
const hrefs=d=>[...d.window.document.querySelectorAll('a')].map(a=>a.getAttribute('href'));
for(const key of articleMap.en.keys()){
 const pair={en:articleMap.en.get(key),es:articleMap.es.get(key)};
 const fragments=Object.fromEntries(['en','es'].map(code=>[code,new JSDOM(articleBody(pair[code]))]));
 for(const selector of ['p','h2','h3','table','th','td','img','a'])assert.equal(fragments.en.window.document.querySelectorAll(selector).length,fragments.es.window.document.querySelectorAll(selector).length,'Article completeness for '+key+': '+selector);
 assert.deepEqual(hrefs(fragments.en),hrefs(fragments.es),'Every article citation and image credit must retain its exact destination and order: '+key);
 assert.equal(pair.es.date,pair.en.date);assert.equal(pair.es.author,pair.en.author);assert.equal(pair.es.image,pair.en.image);
 for(const code of ['en','es']){
  const a=pair[code],route=locales[code].routes.insights+a.slug+'/';
  const d=dom(route),doc=d.window.document,article=doc.querySelector('article'),fragment=fragments[code].window.document;
  assert.equal(doc.querySelector('h1').textContent,a.title);
  assert(normalized(article.textContent).includes(normalized(fragment.body.textContent)));
  const leadImage=[...article.querySelectorAll('img')].find(image=>image.getAttribute('src')===a.image);
  assert(leadImage,'Missing article image: '+a.slug);assert.equal(leadImage.alt,a.image_alt);
  for(const selector of ['table','th','td','img'])assert.equal(article.querySelectorAll(selector).length,fragment.querySelectorAll(selector).length,'Rendered article structure for '+a.slug+': '+selector);
  for(const region of article.querySelectorAll('.article-table-wrap')){assert.equal(region.tabIndex,0);assert(region.getAttribute('aria-label'));}
  const data=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(x=>x['@type']==='Article');
  assert.equal(data.inLanguage,locales[code].lang);assert(data[code==='en'?'workTranslation':'translationOfWork']);d.window.close();
 }
 Object.values(fragments).forEach(d=>d.window.close());
}
checks.push('All '+articleMap.en.size+' published article pairs: matching structure and source destinations; dates, authors, images, alternative text, and bilingual Article metadata checked.');
const sitemap=new JSDOM(fs.readFileSync(root+'/dist/sitemap.xml','utf8'),{contentType:'application/xml'});
const ns='http://www.sitemaps.org/schemas/sitemap/0.9',xhtml='http://www.w3.org/1999/xhtml';
const urls=[...sitemap.window.document.getElementsByTagNameNS(ns,'url')];assert.equal(urls.length,inventory.length);
for(const item of inventory){const node=urls.find(u=>u.getElementsByTagNameNS(ns,'loc')[0].textContent===config.origin+item.path);assert(node);assert.equal(node.getElementsByTagNameNS(xhtml,'link').length,3);}
sitemap.window.close();
for(const route of ['/404.html','/es/404.html']){
 const result=await validator.validateString(read(route));assert(result.valid,JSON.stringify(result.results));
 const d=dom(route);assert.equal(d.window.document.querySelectorAll('.language-switcher a').length,2);d.window.close();
}
checks.push('Sitemap has all '+inventory.length+' canonical pages with reciprocal alternatives; both language versions of 404 markup validate.');
const report={date:new Date().toISOString(),pages:inventory.length,languageLinkTargets:linkedPairs,checks,failures:0,limitations:'Emulated DOM and static markup only. No real-browser responsive rendering, VoiceOver, NVDA, or end-to-end human bilingual user test.'};
fs.writeFileSync(root+'/docs/bilingual-qa.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

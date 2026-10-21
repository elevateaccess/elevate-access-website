const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');const axe=require('axe-core');const {HtmlValidate}=require('html-validate');
const root=path.resolve(__dirname,'..');const dist=path.join(root,'dist');const content=JSON.parse(fs.readFileSync(root+'/content/site.json','utf8'));const publishedArticles=content.articles.filter(a=>a.status==='published');const paths=JSON.parse(fs.readFileSync(root+'/docs/seo-inventory.json','utf8')).map(p=>p.path);
const report={date:new Date().toISOString(),scope:'Static markup and emulated DOM only. No real-browser layout, contrast inference, keyboard system integration, or assistive technology testing.',markup:[],accessibility:[],functional:[],versions:{axe:axe.version,jsdom:require('jsdom/package.json').version,'html-validate':require('html-validate/package.json').version}};
const validator=new HtmlValidate({extends:['html-validate:recommended'],rules:{'prefer-native-element':'off','no-inline-style':'error','long-title':'off'}});
const script=fs.readFileSync(path.join(root,'web/site.js'),'utf8');
function dom(route,match=true){const f=path.join(dist,route,'index.html');const d=new JSDOM(fs.readFileSync(f,'utf8'),{url:'https://draft.example'+route,runScripts:'outside-only',pretendToBeVisual:true});d.window.matchMedia=()=>({matches:match,addEventListener(){}});return d;}
(async()=>{
for(const route of paths){
 const f=path.join(dist,route,'index.html');const html=fs.readFileSync(f,'utf8');const vr=await validator.validateString(html,f);report.markup.push({route,valid:vr.valid,errors:vr.results.flatMap(r=>r.messages.map(m=>({rule:m.ruleId,line:m.line,message:m.message}))) });
 const d=dom(route);d.window.eval(script);d.window.eval(axe.source);
 const ar=await d.window.axe.run(d.window.document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']},rules:{'color-contrast':{enabled:false}}});
 report.accessibility.push({route,violations:ar.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)})),incomplete:ar.incomplete.map(v=>v.id),passes:ar.passes.length});
 const logos=[...d.window.document.querySelectorAll('.brand img,.footer-brand img')];assert.equal(logos.length,2,'Expected decorative header and footer logos: '+route);for(const logo of logos){assert.equal(logo.getAttribute('alt'),'');assert.equal(logo.getAttribute('aria-hidden'),'true');}
 d.window.close();
}
for(const file of ['eas-header-reversed.svg','eas-footer-reversed.svg','eas-mark.svg']){const svg=fs.readFileSync(path.join(root,'assets',file),'utf8');assert(!/<(?:title|desc)\b|role="img"|aria-labelledby=/i.test(svg),file+' exposes design-file metadata to assistive technology');}
report.functional.push('Logo links retain clean accessible names while decorative SVG files remain hidden from assistive technology');
{
 const d=dom('/');const w=d.window;w.eval(script);const b=w.document.querySelector('.menu-toggle');const nav=w.document.querySelector('#site-navigation');const rootElement=w.document.documentElement;
 assert(!rootElement.classList.contains('keyboard-navigation'));w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));assert(rootElement.classList.contains('keyboard-navigation'));w.document.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert(!rootElement.classList.contains('keyboard-navigation'));
 const styles=fs.readFileSync(path.join(root,'web/styles.css'),'utf8');assert(styles.includes('.js:not(.keyboard-navigation) :focus-visible{outline:none}'));assert(styles.includes('.js.keyboard-navigation :focus{outline:3px solid var(--focus)'));
 assert.equal(b.hidden,false);assert.equal(b.getAttribute('aria-expanded'),'false');b.click();assert.equal(b.getAttribute('aria-expanded'),'true');assert(nav.classList.contains('is-open'));w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(b.getAttribute('aria-expanded'),'false');assert.equal(w.document.activeElement,b);report.functional.push('Input-aware focus styling, mobile menu toggle state, Escape close, and return focus passed in emulated DOM');d.window.close();
}
{
 const d=dom('/contact/');const doc=d.window.document;
 assert.equal(doc.querySelectorAll('form,input,textarea,select').length,0);
 assert(doc.querySelector('main .contact-email').textContent==='info@elevateaccess.us');
 assert.equal(doc.querySelector('main a[href^="tel:"]').getAttribute('href'),'tel:+15102245251');
 d.window.close();
 for(const route of paths){const d=dom(route);assert(!/request a consultation/i.test(d.window.document.body.textContent));assert.equal(d.window.document.querySelectorAll('form').length,0);for(const email of d.window.document.querySelectorAll('.contact-email')){assert.equal(email.tagName,'A');assert.equal(email.getAttribute('href'),'mailto:info@elevateaccess.us');assert.equal(email.textContent,'info@elevateaccess.us');}d.window.close();}
 const founders=dom('/founders/');assert(founders.window.document.querySelector('main').textContent.includes('RESNA-certified Assistive Technology Professional since 2023'));founders.window.close();
 report.functional.push('Every displayed business email is an accurately named mailto link; contact phone is present; consultation requests and forms remain absent; Juanita certification states since 2023');
}
{
 const expected='https://www.facebook.com/profile.php?id=61594912121904';
 for(const route of paths){
  const d=dom(route),doc=d.window.document;
  const link=doc.querySelector('footer a.facebook-link');assert(link,'Missing footer Facebook link on '+route);
  assert.equal(link.href,expected);assert.equal(link.textContent,route.startsWith('/es/')?'Elevate Access Solutions en Facebook':'Elevate Access Solutions on Facebook');
  assert(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'][0].sameAs.includes(expected));
  if(route==='/contact/'||route==='/es/contacto/')assert([...doc.querySelectorAll('main a')].some(a=>a.href===expected),'Missing contact Facebook link');
  d.window.close();
 }
 report.functional.push('Facebook footer links on every main page and the Contact page link use the exact user-provided page ID, clear names, and no sharing parameter');
}
// Structural checks complement the rules that require layout in axe.
const seenTitles=new Set();let internalLinks=0;let imageRefs=0;
for(const route of paths){
 const d=dom(route);const doc=d.window.document;
 assert.equal(doc.querySelectorAll('main').length,1);assert.equal(doc.querySelectorAll('h1').length,1);
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
 const title=doc.title;assert(!seenTitles.has(title));seenTitles.add(title);assert(title.length<=120,'Unexpectedly long page title: '+route);
 assert(doc.querySelector('meta[name=description]').content.length>40);
 assert.equal(doc.querySelector('meta[name=robots]').content,JSON.parse(fs.readFileSync(root+'/config.json','utf8')).public_indexing?'index, follow':'noindex, nofollow');
 assert.equal(doc.querySelector('link[rel=canonical]').href,JSON.parse(fs.readFileSync(root+'/config.json','utf8')).origin+route);
 JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
 const headings=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>Number(e.tagName[1]));for(let i=1;i<headings.length;i++)assert(headings[i]<=headings[i-1]+1);
 for(const a of doc.querySelectorAll('a[href]')){
  const u=new URL(a.getAttribute('href'),'https://draft.example'+route);if(u.origin!=='https://draft.example')continue;
  internalLinks++;const target=path.join(dist,u.pathname,'index.html');assert(fs.existsSync(target),'Missing link '+u.pathname);
  if(u.hash){const t=new JSDOM(fs.readFileSync(target,'utf8'));assert(t.window.document.getElementById(decodeURIComponent(u.hash.slice(1))),'Missing anchor '+u.href);t.window.close();}
 }
 for(const image of doc.images){imageRefs++;assert(image.hasAttribute('alt'));assert(Number(image.width)>0&&Number(image.height)>0);assert(fs.existsSync(path.join(dist,image.getAttribute('src'))));}
 d.window.close();
}
const data=JSON.parse(fs.readFileSync(root+'/content/site.json','utf8'));
for(const [route,paragraphs] of [['/services/',data.services.map(s=>s.description)],['/founders/',data.founders.flatMap(f=>f.paragraphs)]]){
 const d=dom(route);const text=d.window.document.querySelector('main').textContent;for(const paragraph of paragraphs)assert(text.includes(paragraph),'Published source paragraph changed');d.window.close();
}
assert(!fs.existsSync(dist+'/insights/example'));
for(const a of publishedArticles){
 const route='/insights/'+a.slug+'/';const d=dom(route);const doc=d.window.document,article=doc.querySelector('article');
 assert.equal(doc.querySelector('h1').textContent,a.title);
 const fragment=new JSDOM(a.body_html),source=fragment.window.document;
 const renderedBody=article.cloneNode(true);
 for(const layoutNode of renderedBody.querySelectorAll(':scope > .article-meta, :scope > .text-link'))layoutNode.remove();
 const expected=source.body.textContent.replace(/\s+/g,' ').trim();
 assert.equal(renderedBody.textContent.replace(/\s+/g,' ').trim(),expected,'Article text changed during build: '+a.slug);
 assert(!/AI-generated|no actual traveler or event|should be rechecked before publication/i.test(renderedBody.textContent));
 const leadImage=[...renderedBody.querySelectorAll('img')].find(image=>image.getAttribute('src')===a.image);
 assert(leadImage,'Missing article image: '+a.slug);assert.equal(leadImage.getAttribute('alt'),a.image_alt);
 for(const selector of ['p','h2','h3','table','th','td','img']){
  assert.equal(renderedBody.querySelectorAll(selector).length,source.querySelectorAll(selector).length,'Article structure changed for '+a.slug+': '+selector);
 }
 const sourceLinks=[...source.querySelectorAll('a')].map(link=>link.getAttribute('href'));
 const articleLinks=[...renderedBody.querySelectorAll('a')].map(link=>link.getAttribute('href'));
 assert.deepEqual(articleLinks,sourceLinks,'Article links changed during build: '+a.slug);
 for(const region of renderedBody.querySelectorAll('.article-table-wrap')){assert.equal(region.tabIndex,0);assert(region.getAttribute('aria-label'));}
 assert.equal(doc.querySelector('meta[property="og:type"]').content,'article');
 assert.equal(doc.querySelector('meta[property="og:image"]').content,JSON.parse(fs.readFileSync(root+'/config.json','utf8')).origin+a.image);
 assert(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].some(x=>x['@type']==='Article'&&x.headline===a.title));
 assert(fs.readFileSync(dist+'/sitemap.xml','utf8').includes(route));fragment.window.close();d.window.close();
}
const aiArticle=publishedArticles.find(a=>a.slug==='ai-agents-digital-independence');
assert(aiArticle,'Missing AI agents article');
const aiFragment=new JSDOM(aiArticle.body_html);
assert([...aiFragment.window.document.querySelectorAll('figcaption')].some(c=>c.textContent.includes('Sherm for Disabled And Here')),'AI article image credit missing');
aiFragment.window.close();
report.functional.push(internalLinks+' internal link and fragment references, '+imageRefs+' local image references, unique IDs and titles, heading hierarchy, metadata, structured data, indexing controls, exact preservation of service descriptions and biographies, and '+publishedArticles.length+' published article checks passed');
function luminance(hex){return hex.match(/[a-f0-9]{2}/gi).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);}
const pairs=[
 ['Main text','#142c43','#f3f6f9',4.5],['Secondary text','#465c70','#f3f6f9',4.5],['Light section links','#12618d','#f3f6f9',4.5],['Links on alternate section','#12618d','#e8eff5',4.5],['Dark hero text','#ffffff','#0b1f32',4.5],['Hero secondary text','#d5e3ed','#0b1f32',4.5],['Dark links','#a5d8f5','#0b1f32',4.5],['Footer text','#d5e3ed','#0D1B2A',4.5],['Header navigation','#e8f2fa','#0D1B2A',4.5],['Button text','#0b1f32','#a5d8f5',4.5],['Button on light section','#ffffff','#0b1f32',4.5],['Error text','#a62323','#ffffff',4.5],['Input border','#687f93','#ffffff',3],['Dark control border','#7b9ab3','#0D1B2A',3],['Light focus','#123554','#f3f6f9',3],['Dark focus','#ffce7a','#0b1f32',3],['Draft banner','#0b1f32','#dcebf5',4.5],['CTA secondary text','#d5e3ed','#123554',4.5]
];
report.tokenContrast=pairs.map(([name,fg,bg,minimum])=>{const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=minimum,name+' fails contrast');return{name,foreground:fg,background:bg,ratio:Number(ratio.toFixed(2)),minimum};});
report.functional.push('All '+pairs.length+' declared design-token contrast pairs meet stated text or nontext thresholds; this is a calculation, not rendered-page contrast coverage');
report.totals={markupErrors:report.markup.reduce((n,r)=>n+r.errors.length,0),axeViolations:report.accessibility.reduce((n,r)=>n+r.violations.length,0)};fs.writeFileSync(root+'/docs/automated-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.totals.markupErrors||report.totals.axeViolations)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

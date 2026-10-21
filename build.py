#!/usr/bin/env python3
"""Build the bilingual static website. Never publishes or changes DNS."""
import argparse,hashlib,html,json,re,shutil
from pathlib import Path
from datetime import date
from xml.sax.saxutils import escape as xml
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--origin');parser.add_argument('--public',action='store_true');args=parser.parse_args()
config=json.loads((ROOT/'config.json').read_text());origin=(args.origin or config['origin']).rstrip('/');public=args.public or config.get('public_indexing',False)
if not origin.startswith('https://'):raise ValueError('HTTPS origin required')
locales=json.loads((ROOT/'content/locales.json').read_text())
content={code:json.loads((ROOT/('content/site.json'if code=='en'else f'content/site.{code}.json')).read_text())for code in locales}
def signature(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
english_public={k:v for k,v in content['en'].items()if k!='source_note'}
english_public['articles']=[a for a in english_public['articles']if a.get('status')=='published']
for code in locales:
 if code=='en':continue
 if content[code].get('translation_source_sha256')!=signature(english_public):raise ValueError('Review and update the '+code+' content translation to match the current English source')
 if locales[code].get('translation_source_ui_sha256')!=signature(locales['en']['ui']):raise ValueError('Review and update the '+code+' interface translation to match the current English source')
for code,C in content.items():
 if C['business']!=content['en']['business']:raise ValueError('Business identity or contact mismatch: '+code)
 for a in C['articles']:
  if 'body_file'in a:
   file=(ROOT/a['body_file']).resolve()
   if not file.is_relative_to(ROOT/'content'):raise ValueError('Article body must be in content/')
   a['body_html']=file.read_text().strip()
NAV=['home','about','founders','services','insights','contact'];article_routes={}
for code,C in content.items():
 article_routes[code]={}
 for a in C['articles']:
  if a.get('status')!='published':continue
  if not re.fullmatch('[a-z][a-z0-9-]*',a['slug']):raise ValueError('Invalid article slug')
  date.fromisoformat(a['date']);key=a.get('translation_key',a['slug'])
  if key in article_routes[code]:raise ValueError('Duplicate article translation key')
  article_routes[code][key]=locales[code]['routes']['insights']+a['slug']+'/'
if any(set(article_routes[c])!=set(article_routes['en'])for c in locales):raise ValueError('Every published article needs its matching translation')
D=ROOT/'dist';D.mkdir(exist_ok=True)
for child in D.iterdir():
 if child.is_dir():shutil.rmtree(child)
 else:child.unlink()
shutil.copytree(ROOT/'assets',D/'assets');shutil.copy(ROOT/'web/styles.css',D/'assets/styles.css');shutil.copy(ROOT/'web/site.js',D/'assets/site.js')
pages=[]
def e(t):return html.escape(str(t),quote=True)
def p(t,cls=''):return f'<p class="{e(cls)}">{e(t)}</p>'if cls else f'<p>{e(t)}</p>'
def link(url,label,cls='text-link'):return f'<a class="{e(cls)}" href="{e(url)}">{e(label)} <span class="arrow" aria-hidden="true">↗</span></a>'
def photo(name,alt,w,h,loading='lazy'):return f'<img src="/assets/{e(name)}.webp" alt="{e(alt)}" width="{w}" height="{h}" loading="{loading}" decoding="async">'
def pairs(key,article=False):return {code:article_routes[code][key]if article else locales[code]['routes'][key]for code in locales}
class Website:
 def __init__(self,code):self.code=code;self.L=locales[code];self.C=content[code];self.B=self.C['business']
 def u(self,key,**values):return self.L['ui'][key].format(**values)
 def r(self,key):return self.L['routes'][key]
 def date_label(self,value):
  if self.code=='en':return value
  d=date.fromisoformat(value);months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return f'{d.day} de {months[d.month-1]} de {d.year}'
 def languages(self,pair):
  items=''.join(f'<li><a href="{e(pair[c])}" lang="{c}" hreflang="{c}"'+(' aria-current="true"'if c==self.code else '')+f'>{e(l["name"])}</a></li>'for c,l in locales.items())
  return f'<nav class="language-switcher" aria-label="{e(self.u("language_navigation"))}"><ul>{items}</ul></nav>'
 def intro(self,label,title,description,extra='',article=False):
  trail=f'<li><a href="{self.r("home")}">{e(self.u("home"))}</a></li>'
  trail+=f'<li><a href="{self.r("insights")}">{e(self.u("insights"))}</a></li><li>{e(self.u("article"))}</li>'if article else f'<li>{e(label)}</li>'
  return f'<div class="dark"><nav class="breadcrumb wrap" aria-label="{e(self.u("breadcrumb"))}"><ol>{trail}</ol></nav><section class="page-intro wrap"><p class="eyebrow">{e(label)}</p><h1>{e(title)}</h1>{p(description,"lead")}{extra}</section></div>'
 def contacts(self):
  B=self.B;phone=e(B['phone']).replace(' ','&#160;').replace('-','&#8209;')
  return f'<a class="contact-email" href="mailto:{e(B["email"])}">{e(B["email"])}</a>',f'<a href="tel:{e(B["phone_uri"])}">{phone}</a>'
 def cta(self):
  email,phone=self.contacts();u=self.u
  return f'<section class="cta dark"><div class="wrap"><div><h2>{e(u("cta_title"))}</h2>{p(u("cta_text"))}</div><address class="cta-contact"><p><strong>{e(u("email"))}</strong><br>{email}</p><p><strong>{e(u("phone"))}</strong><br>{phone}</p></address></div></section>'
 def service_area(self):
  u=self.u;area=self.C['service_area']
  return f'<section class="section section-alt service-area" aria-labelledby="service-area-heading"><div class="wrap"><div class="section-head"><p class="eyebrow">{e(u("service_area_label"))}</p><h2 id="service-area-heading">{e(u("service_area_heading"))}</h2></div><div class="split"><div><h3>{e(u("service_area_local_heading"))}</h3>{p(area["local_text"])}</div><div><h3>{e(u("service_area_remote_heading"))}</h3>{p(area["remote_text"])}{p(area["inquiry_text"])}</div></div></div></section>'
 def portrait(self,f):
  i=f.get('portrait')
  if not i:return ''
  return f'<img class="founder-portrait" src="/assets/{e(i["file"])}" srcset="/assets/{e(i["small_file"])} 480w, /assets/{e(i["file"])} 900w" sizes="(max-width: 48rem) min(22rem, calc(100vw - 2.5rem)), 22rem" alt="{e(i["alt"])}" width="{i["width"]}" height="{i["height"]}" loading="lazy" decoding="async">'
 def page(self,key,title,description,body,article=None):
  pair=pairs(key,article=bool(article));path=pair[self.code];url=origin+path;B=self.B;u=self.u;r=self.r
  nav=''.join(f'<li><a href="{r(k)}"'+(' aria-current="page"'if path==r(k)else '')+(' class="nav-contact"'if k=='contact'else '')+f'>{e(u("founders_nav"if k=="founders"else k))}</a></li>'for k in NAV)
  foot=''.join(f'<li><a href="{r(k)}">{e(u(k))}</a></li>'for k in NAV)
  schema={'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization','name':B['name'],'legalName':B['legal_name'],'url':origin+'/','logo':origin+'/assets/logo.png','email':B['email'],'telephone':B['phone_uri'],'sameAs':[B['facebook_url']],'founder':[{'@type':'Person','name':f['name']}for f in self.C['founders']]},{'@type':'WebSite','@id':origin+'/#website','url':origin+'/','name':B['name'],'inLanguage':[l['lang']for l in locales.values()],'publisher':{'@id':origin+'/#organization'}},{'@type':'WebPage','@id':url+'#webpage','url':url,'name':title,'description':description,'inLanguage':self.L['lang'],'isPartOf':{'@id':origin+'/#website'}}]}
  schema['@graph'][0]['areaServed']=self.C['service_area']['schema_description']
  share_image=origin+(article['image']if article else '/assets/workstation.webp');share_alt=article['image_alt']if article else u('share_alt')
  if article:
   data={'@type':'Article','@id':url+'#article','headline':article['title'],'description':description,'datePublished':article['date'],'inLanguage':self.L['lang'],'author':{'@id':origin+'/#organization'},'publisher':{'@id':origin+'/#organization'},'mainEntityOfPage':{'@id':url+'#webpage'},'image':share_image}
   data['translationOfWork'if self.code!='en'else 'workTranslation']={'@id':origin+pair['en'if self.code!='en'else 'es']+'#article'};schema['@graph'].append(data)
  alternates=''.join(f'<link rel="alternate" hreflang="{c}" href="{e(origin+v)}">'for c,v in pair.items())+f'<link rel="alternate" hreflang="x-default" href="{e(origin+pair["en"])}">'
  og_alternates=''.join(f'<meta property="og:locale:alternate" content="{l["og_locale"]}">'for c,l in locales.items()if c!=self.code)
  email,phone=self.contacts();jsonld=json.dumps(schema,ensure_ascii=False).replace('</','<\\/')
  text=f'''<!DOCTYPE html>
<html lang="{self.L['lang']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="robots" content="{'index, follow'if public else 'noindex, nofollow'}"><meta name="theme-color" content="#0D1B2A"><link rel="canonical" href="{e(url)}">{alternates}<link rel="icon" type="image/svg+xml" href="/assets/eas-mark.svg"><link rel="icon" type="image/png" href="/assets/logo.png">
<meta property="og:type" content="{'article'if article else 'website'}"><meta property="og:site_name" content="{e(B['name'])}"><meta property="og:title" content="{e(article['title']if article else title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{e(url)}"><meta property="og:image" content="{e(share_image)}"><meta property="og:image:alt" content="{e(share_alt)}"><meta property="og:locale" content="{self.L['og_locale']}">{og_alternates}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(article['title']if article else title)}"><meta name="twitter:description" content="{e(description)}"><meta name="twitter:image" content="{e(share_image)}"><meta name="twitter:image:alt" content="{e(share_alt)}">
<link rel="stylesheet" href="/assets/styles.css"><script src="/assets/site.js" defer></script><script type="application/ld+json">{jsonld}</script></head>
<body><a class="skip-link" href="#main-content">{e(u('skip'))}</a>
<header class="site-header">{''if public else '<div class="draft-note">'+e(u('draft'))+'</div>'}<div class="wrap header-inner"><a class="brand" href="{r('home')}" aria-label="{e(u('brand_home'))}"><img src="/assets/eas-header-reversed.svg" alt="" width="1780" height="590"></a><div class="header-tools">{self.languages(pair)}<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" data-open-label="{e(u('menu'))}" data-close-label="{e(u('close_menu'))}" hidden>{e(u('menu'))}</button></div><nav class="site-nav" id="site-navigation" aria-label="{e(u('main_navigation'))}"><ul>{nav}</ul></nav></div></header>
<main id="main-content" tabindex="-1">{body}</main>
<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div class="footer-brand"><a href="{r('home')}" aria-label="{e(u('brand_home'))}"><img src="/assets/eas-footer-reversed.svg" alt="" width="1780" height="590" loading="lazy"></a>{p(u('footer_summary'))}</div><nav aria-label="{e(u('footer_navigation'))}"><h2>{e(u('explore'))}</h2><ul class="footer-links">{foot}</ul></nav><div class="footer-contact"><h2>{e(u('connect'))}</h2>{email}<br>{phone}<br><a class="facebook-link" href="{e(B['facebook_url'])}" rel="me">{e(u('facebook'))}</a></div></div><div class="footer-bottom"><p>© {date.today().year} {e(B['legal_name'])}</p><a href="{r('accessibility')}">{e(u('footer_accessibility'))}</a></div></div></footer></body></html>'''
  target=D/path.strip('/')/'index.html'if path!='/'else D/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text)
  pages.append({'language':self.code,'key':key,'path':path,'title':title,'description':description,'alternates':pair})
 def build(self):
  u,r,C=self.u,self.r,self.C;services=C['services']
  rows=''.join(f'<div class="service-row"><span class="service-number" aria-hidden="true">0{i+1}</span><h3>{e(s["title"])}</h3><div>{p(s["summary"])}{link(r("services")+"#"+s["id"],u("explore_service",title=s["title"].lower()))}</div></div>'for i,s in enumerate(services))
  home=f'''<section class="hero dark"><div class="wrap hero-grid"><div><p class="eyebrow">{e(u('hero_eyebrow'))}</p><h1>{e(u('hero_title'))}</h1>{p(u('hero_lead'),'lead')}<div class="actions">{link(r('services'),u('explore_services'))}</div></div><figure>{photo('workstation',u('workstation_alt'),1500,744,'eager')}<figcaption>{e(u('hero_caption'))}</figcaption></figure></div></section>{self.service_area()}
<section class="section"><div class="wrap"><div class="section-head"><p class="eyebrow">{e(u('how_help'))}</p><h2>{e(u('support_goals'))}</h2>{p(u('home_service_lead'),'lead')}</div><div class="service-list">{rows}</div></div></section>
<section class="section section-alt"><div class="wrap split split-center"><div>{photo('about',u('about_alt'),977,535)}</div><div><p class="eyebrow">{e(u('perspective'))}</p><h2>{e(u('expertise_experience'))}</h2>{p(u('home_founder_text'))}{link(r('founders'),u('meet_founders'))}</div></div></section>
<section class="section"><div class="wrap split"><div><p class="eyebrow">{e(u('who_serve'))}</p><h2>{e(u('access_personal_one'))}<br>{e(u('access_personal_two'))}</h2>{link(r('about'),u('know_elevate'))}</div><div>{p(u('home_audience_lead'),'lead')}{p(u('home_audience_text'))}</div></div></section>{self.cta()}'''
  self.page('home',u('home_title'),u('home_description'),home)
  audiences=''.join(f'<div class="audience"><h3>{e(a["title"])}</h3>{p(a["description"])}</div>'for a in C['audiences']);principles=''.join(f'<li>{e(u("principle_"+str(i)))}</li>'for i in range(1,6))
  about=self.intro(u('about'),u('about_headline'),C['about']['intro'])+f'''<section class="section"><div class="wrap split"><div><p class="eyebrow">{e(u('purpose'))}</p><h2>{e(u('mission'))}</h2>{p(C['about']['mission'])}</div><div><h2>{e(u('approach'))}</h2>{p(C['about']['approach'])}</div></div></section><section class="section section-alt"><div class="wrap"><div class="section-head"><h2>{e(u('who_serve'))}</h2>{p(u('audience_support'))}</div><div class="audience-grid">{audiences}</div></div></section><section class="section"><div class="wrap split split-center"><div>{photo('about',u('about_alt'),977,535)}</div><div><p class="eyebrow">{e(u('why_elevate'))}</p><h2>{e(u('real_environments'))}</h2><ul class="principles">{principles}</ul>{link(r('founders'),u('meet_both'))}</div></div></section>'''+self.cta()
  self.page('about',u('about_title'),u('about_description'),about)
  bios=''.join(f'<section class="bio" aria-labelledby="founder-{i}"><div><p class="bio-label">{e(u("meet_founders"))}</p><h2 id="founder-{i}">{e(f["name"])}</h2><p class="role">{e(f["role"])}</p>{self.portrait(f)}</div><div>{"".join(p(t)for t in f["paragraphs"])}</div></section>'for i,f in enumerate(C['founders']))
  founders=self.intro(u('founders'),u('founders_headline'),u('founders_description'))+f'<div class="section"><div class="wrap">{bios}</div></div><section class="section section-alt"><div class="wrap narrow"><p class="eyebrow">{e(u("shared_perspective"))}</p><h2>{e(u("experience_work"))}</h2>{p(u("founder_shared"))}{link(r("services"),u("explore_services"))}</div></section>'+self.cta()
  self.page('founders',u('founders_title'),u('founders_meta'),founders)
  subnav='<ul class="subnav">'+''.join(f'<li><a href="#{s["id"]}">{e(s["title"])}</a></li>'for s in services)+'</ul>'
  details=''.join(f'<section class="service-detail" id="{s["id"]}" aria-labelledby="{s["id"]}-heading"><div><p class="eyebrow">0{i+1} / {e(u("our_services"))}</p><h2 id="{s["id"]}-heading">{e(s["title"])}</h2></div><div>{p(s["description"])}{link(r("contact"),u("ask_service",title=s["title"].lower()))}</div></section>'for i,s in enumerate(services))
  servicepage=self.intro(u('services'),u('services_headline'),u('services_description'),subnav)+self.service_area()+f'<div class="section"><div class="wrap"><figure class="page-photo">{photo("services",u("services_alt"),998,666)}</figure>{details}</div></div>'+self.cta()
  self.page('services',u('services_title'),u('services_meta'),servicepage)
  email,phone=self.contacts()
  contact=self.intro(u('contact'),u('contact_headline'),u('contact_description'))+f'''<section class="section"><div class="wrap split"><div><p class="eyebrow">{e(u('get_touch'))}</p><h2>{e(u('contact_goals'))}</h2>{p(u('contact_text'))}{link(r('services'),u('review_services'))}</div><section class="contact-details" aria-labelledby="contact-info-heading"><h2 id="contact-info-heading">{e(u('contact_information'))}</h2><div class="contact-method"><h3>{e(u('email'))}</h3><p>{email}</p>{p(u('email_hint'),'hint')}</div><div class="contact-method"><h3>{e(u('phone'))}</h3>{phone}</div><div class="contact-method"><h3>{e(u('follow'))}</h3>{link(self.B['facebook_url'],u('facebook'))}</div></section></div></section>'''
  self.page('contact',u('contact_title'),u('contact_meta'),contact+self.service_area())
  articles=[a for a in C['articles']if a.get('status')=='published']
  listing=f'<div class="empty-state"><h2>{e(u("articles_perspectives"))}</h2>{p(u("no_articles"))}{p(u("meanwhile"))}<div class="actions">{link(r("services"),u("explore_services"),"button")}{link(r("contact"),u("get_touch"))}</div></div>'
  if articles:
   listing='<ul class="article-list">'
   for a in articles:
    key=a.get('translation_key',a['slug']);route=article_routes[self.code][key];dt=f'<time datetime="{e(a["date"])}">{e(self.date_label(a["date"]))}</time>'
    listing+=f'<li><p class="article-meta">{e(a["category"])} · {dt}</p><h2><a href="{route}">{e(a["title"])}</a></h2>{p(a["description"])}</li>'
    body=self.intro(u('insights'),a['title'],a['description'],article=True)+f'<article class="section wrap prose article-body"><p class="article-meta">{e(u("by"))} {e(a["author"])} · {dt}</p>{a["body_html"]}{link(r("insights"),u("all_insights"))}</article>'
    self.page(key,a.get('seo_title',a['title']+' | Elevate Access Solutions'),a['description'],body,article=a)
   listing+='</ul>'
  insights=self.intro(u('insights'),u('insights_headline'),u('insights_description'))+'<section class="section"><div class="wrap"><p class="eyebrow">'+e(u('topics'))+'</p><ul class="topic-list">'+''.join(f'<li>{e(u(k))}</li>'for k in ['topic_accessibility','topic_at','topic_emerging'])+'</ul>'+listing+'</div></section>'
  self.page('insights',u('insights_title'),u('insights_meta'),insights)
  language_tip=e(u('access_tip_language')).replace('English','<span lang="en">English</span>').replace('Español','<span lang="es">Español</span>')
  tips=''.join(f'<li>{e(u("access_tip_"+str(i)))}</li>'for i in range(1,6))+f'<li>{language_tip}</li>'
  access=self.intro(u('accessibility'),u('access_headline'),u('access_description'))+f'<section class="section"><div class="wrap prose"><h2>{e(u("access_target"))}</h2>{p(u("access_target_text"))}<h2>{e(u("using_site"))}</h2><ul>{tips}</ul><h2>{e(u("barrier"))}</h2><p>{e(u("barrier_before"))} {email} {e(u("or_call"))} {phone}. {e(u("barrier_after"))}</p></div></section>'
  self.page('accessibility',u('access_title'),u('access_meta'),access)
 def fallback(self):
  targets={'en':'/404.html','es':'/es/404.html'};u=self.u
  text=f'<!DOCTYPE html><html lang="{self.L["lang"]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>{e(u("not_found_title"))}</title><meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="/assets/eas-mark.svg"><link rel="stylesheet" href="/assets/styles.css"></head><body><main class="wrap section"><h1>{e(u("not_found"))}</h1>{p(u("not_found_text"))}{link(self.r("home"),u("return_home"),"button")}{self.languages(targets)}</main></body></html>'
  target=D/targets[self.code].lstrip('/');target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text)
for code in locales:
 site=Website(code);site.build();site.fallback()
aliases={'home':'home','home-rebuild':'home','about-original-backup':'about','about-1':'about','meet-the-founders':'founders','founders-original-backup':'founders','services-original-backup':'services','contact-original-backup':'contact','articles':'insights'};site=Website('en')
for old,key in aliases.items():
 target=D/old/'index.html';target.parent.mkdir(parents=True,exist_ok=True);route=site.r(key);label=site.u('home')if key=='home'else route
 target.write_text(f'<!DOCTYPE html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="stylesheet" href="/assets/styles.css"><title>{e(site.u("moved_title"))}</title><meta name="robots" content="noindex, follow"><link rel="canonical" href="{e(origin+route)}"><meta http-equiv="refresh" content="0; url={route}"></head><body><main class="wrap section"><h1>{e(site.u("moved"))}</h1><p><a href="{route}">{e(site.u("continue",label=label))}</a></p></main></body></html>')
sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
for page in pages:
 sitemap+='<url><loc>'+xml(origin+page['path'])+'</loc>'+''.join(f'<xhtml:link rel="alternate" hreflang="{c}" href="{xml(origin+route)}"/>'for c,route in page['alternates'].items())+f'<xhtml:link rel="alternate" hreflang="x-default" href="{xml(origin+page["alternates"]["en"])}"/></url>'
(D/'sitemap.xml').write_text(sitemap+'</urlset>');(D/'robots.txt').write_text('User-agent: *\n'+('Allow: /\nSitemap: '+origin+'/sitemap.xml\n'if public else 'Disallow: /\n'))
(ROOT/'docs/seo-inventory.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2)+'\n');(ROOT/'docs/redirects.csv').write_text('old_path,new_path,required_status\n'+''.join('/'+old+','+site.r(key)+',301 or 308\n'for old,key in aliases.items()))
print(json.dumps({'pages':len(pages),'languages':list(locales),'aliases':len(aliases),'origin':origin,'public_indexing':public,'output':str(D)}))

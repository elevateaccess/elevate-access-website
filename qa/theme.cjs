const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const csstree=require('css-tree');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(root+'/web/styles.css','utf8');
const ast=csstree.parse(css);
const light={},dark={};
function rootVariables(rule, into){
 if(rule.type!=='Rule'||csstree.generate(rule.prelude)!==':root')return;
 rule.block.children.forEach(d=>{if(d.type==='Declaration'&&d.property.startsWith('--'))into[d.property]=csstree.generate(d.value)});
}
let darkMedia='';
ast.children.forEach(node=>{
 rootVariables(node,light);
 if(node.type==='Atrule'&&node.name==='media'&&csstree.generate(node.prelude).includes('prefers-color-scheme:dark')){
  darkMedia=csstree.generate(node.prelude);
  node.block.children.forEach(r=>rootVariables(r,dark));
 }
});
assert(darkMedia.includes('screen'),'Automatic dark theme must not force dark print pages');
function luminance(color){
 if(color==='white')color='#ffffff';
 if(color.length===4)color='#'+color.slice(1).split('').map(c=>c+c).join('');
 assert(/^#[0-9a-f]{6}$/i.test(color),'Unsupported color '+color);
 return color.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
}
function resolve(value,tokens){return value.replace(/var\((--[^)]+)\)/g,(_,key)=>resolve(tokens[key],tokens))}
const checks=[
 ['Reading text','--ink','--paper',4.5],
 ['Muted text and captions','--muted','--paper',4.5],
 ['Reading links','--link','--paper',4.5],
 ['Alternate section text','--ink','--alternate',4.5],
 ['Alternate section links','--link','--alternate',4.5],
 ['Alternate secondary text','--muted','--alternate',4.5],
 ['Keyboard focus on reading background','--focus','--paper',3],
 ['Keyboard focus on alternate sections','--focus','--alternate',3],
 ['Primary button','--button-ink','--button-bg',4.5],
 ['Hovered primary button','--button-ink','--button-hover',4.5],
 ['Secondary button','--secondary-ink','--paper',4.5],
 ['Hovered secondary button','--secondary-ink','--secondary-hover',4.5],
 ['Table header','#ffffff','--table-head',4.5],
 ['Button boundary','--button-border','--paper',3]
];
const results=[];
for(const [theme,tokens] of [['light',light],['dark',{...light,...dark}]]){
 for(const [label,fg,bg,min] of checks){
  // On dark surfaces the approved teal cue is paired with a white outer halo.
  const visibleFocus=theme==='dark'&&label.startsWith('Keyboard focus')?'#ffffff':fg;
  const a=resolve(tokens[visibleFocus]||visibleFocus,tokens),b=resolve(tokens[bg]||bg,tokens);
  const l1=luminance(a),l2=luminance(b),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  assert(ratio>=min,`${theme}: ${label} ${ratio.toFixed(2)} < ${min}`);
  results.push({theme,label,foreground:a,background:b,ratio:+ratio.toFixed(2),minimum:min});
 }
}
assert.equal(light['--navy'],'#0D1B2A','Foundation Navy is the site anchor');
assert.equal(light['--deep'],'#08131F','Deep Navy is reserved for the footer');
assert.equal(light['--link'],'#0E6B6F','Use approved Access Teal on light surfaces');
assert.equal(light['--paper'],'#ffffff','Use the manual\'s white default reading surface');
assert.equal(light['--alternate'],'#F5F8F9','Use the approved neutral alternate surface');
assert.equal(light['--button-radius'],'8px','Use the 8 px button radius');
assert(css.includes('.site-header{background:var(--navy)')&&css.includes('.site-footer{background:var(--deep)'),'Keep the header and footer roles distinct');
assert(css.includes('box-shadow:0 0 0 3px #0E6B6F'),'Dark-surface focus needs the dual-color indicator');
assert(!/filter\s*:\s*invert/i.test(css),'Do not invert portrait and illustration colors');
for(const file of ['index.html','about/index.html','founders/index.html','services/index.html','contact/index.html','insights/index.html','insights/ai-agents-digital-independence/index.html','accessibility/index.html','404.html']){
 assert(fs.readFileSync(root+'/dist/'+file,'utf8').includes('name="color-scheme" content="light dark"'),file+' missing theme support metadata');
}
const report={scope:'CSS parsing and calculated color contrast for both palettes; no browser or screen-reader rendering test.',checks:results};
fs.writeFileSync(root+'/docs/theme-qa.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({themePairs:results.length,failures:0,darkMedia,lightBackground:light['--paper'],darkBackground:dark['--paper']}));

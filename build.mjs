import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const name of fs.readdirSync(root)){if(name.endsWith('.html'))fs.copyFileSync(path.join(root,name),path.join(out,name));}
if(fs.existsSync('media'))fs.cpSync('media',path.join(out,'media'),{recursive:true});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function readPost(file){const raw=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');let meta={},body=raw;
 if(raw.startsWith('---')){const match=raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);if(match){body=raw.slice(match[0].length);for(const line of match[1].split(/\r?\n/)){const m=line.match(/^([\w-]+):\s*(.*)$/);if(m){let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);meta[m[1]]=v;}}}}
 return {meta,body,slug:path.basename(file,'.md'),file};}
function inline(t){return escape(t).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,a,u)=>`<a class="underline text-forest" href="${escape(u)}" rel="noopener noreferrer">${a}</a>`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');}
function markdown(src){const lines=src.split(/\r?\n/),blocks=[];let para=[],list=[];function flush(){if(para.length){blocks.push(`<p class="mb-4 leading-8">${inline(para.join(' '))}</p>`);para=[];}if(list.length){blocks.push(`<ul class="list-disc pl-6 mb-5 space-y-2">${list.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`);list=[];}}
for(const line of lines){const t=line.trim();if(!t){flush();continue;}const h=t.match(/^(#{1,4})\s+(.+)$/);if(h){flush();let n=Math.min(h[1].length+1,5);blocks.push(`<h${n} class="font-title text-forest font-bold text-2xl mt-8 mb-3">${inline(h[2])}</h${n}>`);continue;}const li=t.match(/^[-*]\s+(.+)$/);if(li){if(para.length)flush();list.push(li[1]);continue;}if(list.length)flush();const img=t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);if(img){flush();let u=img[2];if(/^\/(?!\/)/.test(u)||!/^\w+:/.test(u)){blocks.push(`<figure class="my-6"><img class="w-full rounded-2xl" src="${escape(u)}" alt="${escape(img[1])}" loading="lazy"></figure>`);}continue;}para.push(t);}flush();return blocks.join('\n');}
const posts=[];
for(const [dir,kind] of [['contenu/carnets','carnet'],['contenu/destinations','destination']]){
if(!fs.existsSync(dir))continue;
for(const filename of fs.readdirSync(dir).filter(x=>x.endsWith('.md'))){const p=readPost(path.join(dir,filename));p.kind=kind;p.title=p.meta.title||p.slug;p.date=p.meta.date||'';p.url=`${kind}-${slug(p.slug)}.html`;posts.push(p);}}
posts.sort((a,b)=>b.date.localeCompare(a.date));
const head=fs.readFileSync('voyages.html','utf8');const style=head.match(/<style>[\s\S]*?<\/style>/)?.[0]||'';
const css=`<style>body{margin:0;background:#FAF5EC;color:#263D4B;font-family:'Plus Jakarta Sans',sans-serif}main{max-width:850px;margin:0 auto;padding:105px 20px 80px}h1,h2,h3{font-family:Vollkorn,serif}a{color:#314A3D}.card{background:white;border:1px solid #E3DACB;border-radius:18px;padding:22px;margin:16px 0}.back{display:inline-block;margin-bottom:20px}.hero{width:100%;max-height:430px;object-fit:cover;border-radius:18px}.muted{color:#66705A}.pill{display:inline-block;color:#fff;background:#314A3D;border-radius:18px;padding:5px 12px;font-size:12px}</style>`;
const fonts=`<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Vollkorn:wght@600;700&display=swap" rel="stylesheet">`;
for(const p of posts){const cover=p.meta.image?`<img class="hero" src="${escape(p.meta.image)}" alt="${escape(p.title)}">`:'';
const date=p.date?`<p class="muted">${escape(p.date)}</p>`:'';
const description=p.meta.description?`<p style="font-size:18px;line-height:1.7">${escape(p.meta.description)}</p>`:'';
const other=p.kind==='destination'&&p.meta.region?`<p class="muted">${escape(p.meta.region)}</p>`:'';
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(p.title)} — Les Carnets Nomades</title><meta name="description" content="${escape(p.meta.description||p.title)}">${fonts}${css}</head><body><main><a class="back" href="voyages.html">← Tous nos voyages</a><p class="pill">${p.kind==='carnet'?'Grand carnet':'Destination'}</p><h1 style="font-size:clamp(30px,5vw,48px);color:#314A3D;margin:18px 0">${escape(p.title)}</h1>${date}${other}${cover}${description}<article style="line-height:1.8">${markdown(p.body)}</article><div class="card"><a href="voyages.html">← Découvrir tous nos carnets</a></div></main></body></html>`;
fs.writeFileSync(path.join(out,p.url),html);}
const carnets=posts.filter(p=>p.kind==='carnet'),destinations=posts.filter(p=>p.kind==='destination');
function card(p){const img=p.meta.image?`<img src="${escape(p.meta.image)}" alt="" loading="lazy" style="width:100%;max-height:230px;object-fit:cover;border-radius:12px;margin-bottom:12px">`:'';return `<a class="block p-4 bg-paper-card rounded-2xl border border-paper-border hover:border-forest transition-colors" href="${escape(p.url)}">${img}<span class="text-[11px] font-bold uppercase text-terracotta">${escape(p.date||p.meta.region||'La Team BLAS')}</span><h3 class="font-title text-lg font-bold text-forest mt-1">${escape(p.title)}</h3>${p.meta.description?`<p class="text-xs text-navy-soft mt-2">${escape(p.meta.description)}</p>`:''}<span class="text-xs text-forest font-bold inline-block mt-3">Lire le carnet →</span></a>`;}
let listing='';if(carnets.length)listing+=`<section class="flex flex-col gap-3"><h2 class="font-title text-2xl font-bold text-forest">Nos nouveaux grands carnets</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${carnets.map(card).join('')}</div></section>`;
if(destinations.length)listing+=`<section class="flex flex-col gap-3"><h2 class="font-title text-2xl font-bold text-forest">Nos nouvelles destinations</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${destinations.map(card).join('')}</div></section>`;
if(listing){const target=path.join(out,'voyages.html');let page=fs.readFileSync(target,'utf8');page=page.replace('<!-- Le Grand Voyage : Road Trip Été 2026 -->',`${listing} <!-- Le Grand Voyage : Road Trip Été 2026 -->`);fs.writeFileSync(target,page);}
console.log(`Site généré : ${posts.length} article(s), dans dist/`);

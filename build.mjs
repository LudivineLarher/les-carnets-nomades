import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.html')) {
    fs.copyFileSync(path.join(root, name), path.join(out, name));
  }
}
if (fs.existsSync('media')) {
  fs.cpSync('media', path.join(out, 'media'), { recursive: true });
}

const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
  '"': '&quot;', "'": '&#39;'
}[c]));

const slug = s => String(s).normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function readPost(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  let meta = {}, body = raw;
  if (raw.startsWith('---')) {
    const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
    if (match) {
      body = raw.slice(match[0].length);
      for (const line of match[1].split(/\r?\n/)) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) {
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) ||
              (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          meta[m[1]] = v;
        }
      }
    }
  }
  return { meta, body, slug: path.basename(file, '.md'), file };
}

function inline(t) {
  return escape(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, a, u) => `<a href="${escape(u)}" rel="noopener noreferrer">${a}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function markdown(src) {
  const lines = src.split(/\r?\n/);
  const blocks = [];
  let para = [], list = [];

  function flush() {
    if (para.length) {
      blocks.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
    if (list.length) {
      blocks.push(`<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`);
      list = [];
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }

    const h = t.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flush();
      const n = Math.min(h[1].length + 1, 5);
      blocks.push(`<h${n}>${inline(h[2])}</h${n}>`);
      continue;
    }

    const li = t.match(/^[-*]\s+(.+)$/);
    if (li) {
      if (para.length) flush();
      list.push(li[1]);
      continue;
    }
    if (list.length) flush();

    const img = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      flush();
      const u = img[2];
      if (/^\/(?!\/)/.test(u) || !/^\w+:/.test(u)) {
        blocks.push(
          `<figure><img src="${escape(u)}" alt="${escape(img[1])}" loading="lazy">` +
          (img[1] ? `<figcaption>${escape(img[1])}</figcaption>` : '') +
          `</figure>`
        );
      }
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks.join('\n');
}

const posts = [];

for (const [dir, kind] of [
  ['contenu/carnets', 'carnet'],
  ['contenu/destinations', 'destination']
]) {
  if (!fs.existsSync(dir)) continue;

  for (const filename of fs.readdirSync(dir).filter(x => x.endsWith('.md'))) {
    const p = readPost(path.join(dir, filename));
    p.kind = kind;
    p.title = p.meta.title || p.slug;
    p.date = p.meta.date || '';
    p.url = `${kind}-${slug(p.slug)}.html`;
    posts.push(p);
  }
}

posts.sort((a, b) => b.date.localeCompare(a.date));

const fonts = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Vollkorn:wght@600;700&display=swap" rel="stylesheet">`;

const css = `<style>
:root {
  --forest:#304b3f;
  --cream:#faf5ec;
  --terra:#b76c4e;
  --sand:#e9d8c3;
  --ink:#33433b;
}
* { box-sizing:border-box; }
body {
  margin:0;
  background:var(--cream);
  color:var(--ink);
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:15px;
}
a { color:var(--forest); }
.journal {
  max-width:1050px;
  margin:auto;
  padding:42px 22px 85px;
}
.journal-top {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
  padding-bottom:20px;
  border-bottom:1px solid #e7ddcd;
}
.journal-brand {
  text-decoration:none;
  font-family:Vollkorn,serif;
  font-size:22px;
  font-weight:700;
}
.journal-back {
  text-decoration:none;
  font-size:13px;
  font-weight:700;
}
.journal-head {
  padding:56px 0 30px;
}
.journal-kicker {
  color:var(--terra);
  font-size:12px;
  letter-spacing:.14em;
  text-transform:uppercase;
  font-weight:700;
}
.journal-title {
  font-family:Vollkorn,serif;
  color:var(--forest);
  font-size:clamp(37px,6vw,70px);
  line-height:1.12;
  letter-spacing:-.025em;
  max-width:850px;
  margin:14px 0 22px;
}
.journal-intro {
  font-size:clamp(16px,2.2vw,20px);
  line-height:1.85;
  max-width:760px;
}
.journal-date {
  font-size:13px;
  color:#7a756d;
  margin-top:12px;
}
.journal-cover {
  margin:15px 0 45px;
}
.journal-cover img {
  width:100%;
  max-height:560px;
  object-fit:cover;
  border-radius:5px;
  display:block;
}
.journal-cover figcaption {
  font-size:12px;
  font-style:italic;
  color:#756c62;
  text-align:right;
  padding:10px 4px;
}
.journal-divider {
  display:flex;
  align-items:center;
  gap:16px;
  margin:38px 0 26px;
  color:var(--terra);
  font-family:Vollkorn,serif;
  font-size:24px;
}
.journal-divider:after {
  content:'';
  height:1px;
  background:#ddcbb6;
  flex:1;
}
.journal-paper {
  position:relative;
  background:#fffdf9;
  border:1px solid #e8dfd2;
  box-shadow:0 12px 35px rgba(57,55,38,.045);
  border-radius:6px;
  padding:clamp(23px,4vw,48px);
  max-width:890px;
  margin:auto;
}
.journal-paper:before {
  content:'';
  position:absolute;
  width:92px;
  height:24px;
  background:rgba(215,186,150,.46);
  top:-11px;
  left:calc(50% - 46px);
  transform:rotate(-3deg);
}
.journal-story {
  font-size:16px;
  line-height:1.95;
}
.journal-story p {
  margin:0 0 22px;
}
.journal-story h2,
.journal-story h3,
.journal-story h4,
.journal-story h5 {
  font-family:Vollkorn,serif;
  color:var(--forest);
  line-height:1.2;
  margin:38px 0 15px;
}
.journal-story h2 { font-size:32px; }
.journal-story h3 { font-size:26px; }
.journal-story ul {
  padding-left:25px;
  margin:0 0 25px;
}
.journal-story li { padding:4px 0; }
.journal-story figure {
  margin:32px auto;
  max-width:720px;
  background:#fff;
  padding:12px 12px 22px;
  border:1px solid #eee5d8;
  box-shadow:0 9px 22px #372b1b16;
  transform:rotate(-.6deg);
}
.journal-story figure:nth-of-type(even) {
  transform:rotate(.6deg);
}
.journal-story figure img {
  width:100%;
  display:block;
  border-radius:2px;
}
.journal-story figure figcaption {
  text-align:center;
  font-size:13px;
  color:#736c62;
  font-style:italic;
  padding-top:10px;
}
.journal-note {
  max-width:890px;
  margin:32px auto 0;
  padding:25px 28px;
  border-radius:5px;
  border:1px dashed #c7aa88;
  background:#f4eadc;
  display:flex;
  align-items:center;
  gap:15px;
}
.journal-note-mark { font-size:29px; }
.journal-note p {
  margin:4px 0 0;
  font-size:13px;
  line-height:1.65;
}
.journal-note strong {
  font-family:Vollkorn,serif;
  font-size:21px;
  color:var(--forest);
}
.journal-footer {
  text-align:center;
  margin-top:45px;
}
.journal-footer a {
  display:inline-block;
  text-decoration:none;
  background:var(--forest);
  color:#fff;
  padding:14px 24px;
  border-radius:30px;
  font-size:13px;
  font-weight:700;
}
.journal-doodle {
  font-size:28px;
  color:var(--terra);
  padding-left:10px;
}
.journal-empty {
  font-style:italic;
  color:#716a62;
}
.journal-region {
  color:#736c62;
  font-size:13px;
}
.journal-story a {
  text-decoration:underline;
  text-underline-offset:3px;
}
@media(max-width:600px) {
  .journal { padding:20px 16px 60px; }
  .journal-head { padding:35px 0 18px; }
  .journal-title { font-size:38px; }
  .journal-cover { margin:10px 0 25px; }
  .journal-paper { padding:28px 20px; }
  .journal-note { padding:20px; }
  .journal-brand { font-size:19px; }
}
</style>`;

for (const p of posts) {
  const cover = p.meta.image
    ? `<figure class="journal-cover"><img src="${escape(p.meta.image)}" alt="${escape(p.title)}"><figcaption>Les Carnets Nomades · La Team BLAS ♡</figcaption></figure>`
    : '';

  const date = p.date
    ? `<p class="journal-date">${escape(p.date)}</p>` : '';

  const description = p.meta.description
    ? `<p class="journal-intro">${escape(p.meta.description)}</p>` : '';

  const region = p.kind === 'destination' && p.meta.region
    ? `<p class="journal-region">${escape(p.meta.region)}</p>` : '';

  const story = p.body.trim()
    ? markdown(p.body)
    : '<p class="journal-empty">Notre récit arrive bientôt…</p>';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(p.title)} — Les Carnets Nomades</title>
<meta name="description" content="${escape(p.meta.description || p.title)}">
${fonts}
${css}
</head>
<body>
<main class="journal">
<nav class="journal-top" aria-label="Navigation">
<a class="journal-brand" href="index.html">Les Carnets Nomades <span style="color:var(--terra)">♡</span></a>
<a class="journal-back" href="voyages.html">← Tous nos voyages</a>
</nav>
<header class="journal-head">
<div class="journal-kicker">${p.kind === 'carnet' ? 'Grand carnet' : 'Destination'} · La Team BLAS <span class="journal-doodle">✳</span></div>
<h1 class="journal-title">${escape(p.title)}</h1>
${date}${region}${description}
</header>
${cover}
<div class="journal-divider">Notre histoire sur la route ♡</div>
<section class="journal-paper">
<article class="journal-story">${story}</article>
</section>
<aside class="journal-note">
<span class="journal-note-mark" aria-hidden="true">✿</span>
<div>
<strong>Les petits souvenirs de la Team BLAS</strong>
<p>Un carnet à enrichir au fil de nos découvertes, de nos photos et de nos moments en famille.</p>
</div>
</aside>
<footer class="journal-footer">
<a href="voyages.html">Découvrir tous nos carnets →</a>
</footer>
</main>
</body>
</html>`;

  fs.writeFileSync(path.join(out, p.url), html);
}

const carnets = posts.filter(p => p.kind === 'carnet');
const destinations = posts.filter(p => p.kind === 'destination');

function card(p) {
  const img = p.meta.image
    ? `<img src="${escape(p.meta.image)}" alt="" loading="lazy" style="width:100%;max-height:230px;object-fit:cover;border-radius:12px;margin-bottom:12px">`
    : '';

  return `<a class="block p-4 bg-paper-card rounded-2xl border border-paper-border hover:border-forest transition-colors" href="${escape(p.url)}">
${img}
<span class="text-[11px] font-bold uppercase text-terracotta">${escape(p.date || p.meta.region || 'La Team BLAS')}</span>
<h3 class="font-title text-lg font-bold text-forest mt-1">${escape(p.title)}</h3>
${p.meta.description ? `<p class="text-xs text-navy-soft mt-2">${escape(p.meta.description)}</p>` : ''}
<span class="text-xs text-forest font-bold inline-block mt-3">Lire le carnet →</span>
</a>`;
}

function insertAfterMain(file, html) {
  const target = path.join(out, file);
  if (!fs.existsSync(target)) {
    throw new Error(`Page absente : ${file}`);
  }
  let page = fs.readFileSync(target, 'utf8');
  const re = /<main\b[^>]*>/i;
  if (!re.test(page)) {
    throw new Error(`Balise <main> introuvable dans ${file}`);
  }
  page = page.replace(re, match => `${match}\n${html}\n`);
  fs.writeFileSync(target, page);
}

if (posts.length) {
  const homeCards = carnets.slice(0, 3).map(card).join('');

  const homeSection = homeCards
    ? `<section aria-label="Nouveaux carnets" class="flex flex-col gap-3 home-new-carnets">
<h2 class="font-title text-2xl font-bold text-forest">🍂 Nos nouveaux grands carnets</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${homeCards}</div>
<a class="text-forest font-bold text-sm underline" href="voyages.html">Tous nos voyages →</a>
</section>`
    : '';

  if (homeSection) insertAfterMain('index.html', homeSection);

  let listing = '';

  if (carnets.length) {
    listing += `<section class="flex flex-col gap-3">
<h2 class="font-title text-2xl font-bold text-forest">Nos nouveaux grands carnets</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${carnets.map(card).join('')}</div>
</section>`;
  }

  if (destinations.length) {
    listing += `<section class="flex flex-col gap-3">
<h2 class="font-title text-2xl font-bold text-forest">Nos nouvelles destinations</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${destinations.map(card).join('')}</div>
</section>`;
  }

  if (listing) insertAfterMain('voyages.html', listing);
}

console.log(`Site généré : ${posts.length} article(s), dans dist/ ; accueil et voyages mis à jour.`);

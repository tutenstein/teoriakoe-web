// Road sign hub, group pages and the 373 sign pages.
import { esc, slugify, signCodeSlug, stripTags, wordCount } from '../scripts/lib/text.js';
import { adSlot, breadcrumb, cta, signCard, signImage, sources, SIGN_CREDIT } from './components.js';

export const HUB_URL = '/liikennemerkit/';
export const MIN_SIGN_WORDS = 200;
const HUB_CRUMB = { name: 'Liikennemerkit', url: HUB_URL };
const HOME_CRUMB = { name: 'Etusivu', url: '/' };

// Deterministic pseudo-random order, so rebuilding never changes a page by itself.
function seeded(seedText) {
  let seed = [...seedText].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, seedText) {
  const rand = seeded(seedText);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fit(title, max = 60) {
  return title.length <= max ? title : title.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function clip(text, max = 158) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export function prepareSigns(signsJson, images) {
  const groups = signsJson.categories.map((c) => ({
    ...c,
    slug: slugify(c.fi),
    url: `${HUB_URL}${slugify(c.fi)}/`,
    signs: []
  }));
  const byGroup = new Map(groups.map((g) => [g.id, g]));
  const signs = signsJson.signs.map((s) => {
    const image = images[s.code];
    if (!image) throw new Error(`No image for sign ${s.code}; run npm run sync`);
    const sign = {
      ...s,
      group: byGroup.get(s.category),
      url: `${HUB_URL}${signCodeSlug(s.code)}-${slugify(s.nameFi, 48)}/`,
      img: { src: `/kuvat/merkit/${image.file}`, width: image.width, height: image.height }
    };
    sign.group.signs.push(sign);
    return sign;
  });
  const byCode = new Map(signs.map((s) => [s.code, s]));
  const seen = new Set();
  for (const s of signs) {
    if (seen.has(s.url)) throw new Error(`Duplicate sign URL ${s.url}`);
    seen.add(s.url);
  }
  return { groups, signs, byCode };
}

function neighbours(sign, count = 4) {
  const list = sign.group.signs;
  const i = list.indexOf(sign);
  const out = [];
  for (let d = 1; out.length < count && d < list.length; d++) {
    if (list[i + d]) out.push(list[i + d]);
    if (out.length < count && list[i - d]) out.push(list[i - d]);
  }
  return out;
}

function codes(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map(String);
}

function signCheck(sign, data, byCode) {
  const confused = codes(data.confused).map((c) => byCode.get(c)).filter(Boolean);
  const target = confused[0] || neighbours(sign, 1)[0];
  if (!target) return '';
  const pool = shuffle(
    sign.group.signs.filter((s) => s !== sign && s !== target && s.nameFi !== target.nameFi),
    sign.code + 'pool'
  );
  const extra = pool.length >= 2 ? pool.slice(0, 2) : shuffle([...byCode.values()].filter((s) => s !== sign && s !== target), sign.code).slice(0, 2);
  const options = shuffle([sign, target, ...extra], sign.code);
  const letters = 'ABCD';
  const buttons = options
    .map(
      (s, i) =>
        `<li><button class="option" type="button"${s === target ? ' data-correct' : ''}><span class="tile">${signImage(s, { alt: `Vaihtoehto ${letters[i]}` })}</span></button></li>`
    )
    .join('');
  const ok = `Oikein! Merkki ${target.code} on ${target.nameFi}.`;
  const no = `Ei aivan. ${target.nameFi} on merkki ${target.code}, vaihtoehto ${letters[options.indexOf(target)]}.`;
  return `<section class="sign-check" aria-labelledby="testaa">
<h2 id="testaa">Testaa itsesi</h2>
<p class="quiz-q">Mikä näistä merkeistä on <strong>${esc(target.nameFi)}</strong>?</p>
<ul class="options images">${buttons}</ul>
<div class="feedback" hidden data-ok="${esc(ok)}" data-no="${esc(no)}" aria-live="polite"><p></p></div>
<p><a href="/liikennemerkkitesti/">Tee koko liikennemerkkitesti</a></p>
</section>`;
}

function signFallback(sign) {
  const group = sign.group;
  const meaning = sign.descFi
    ? `<h2 id="mita-merkki-tarkoittaa">Mitä merkki tarkoittaa</h2><p>${esc(sign.descFi)}</p>`
    : '';
  return `${meaning}<h2 id="ryhma">${esc(group.fi)}</h2><p>${esc(group.dfi)}</p>
<p>Merkin virallinen tunnus on ${esc(sign.code)}. Ryhmän ${esc(group.id)} kaikki merkit näet sivulta <a href="${group.url}">${esc(group.fi)}</a>.</p>`;
}

export function signRoute(sign, ctx, content) {
  const { byCode } = ctx.signData;
  const data = content?.data || {};
  const group = sign.group;
  const rendered = content ? ctx.markdown(content.body) : null;
  const words = rendered ? wordCount(stripTags(rendered.html)) : 0;
  const indexable = words >= MIN_SIGN_WORDS && data.noindex !== true;
  const crumbs = [HOME_CRUMB, HUB_CRUMB, { name: group.fi, url: group.url }, { name: `${sign.code} ${sign.nameFi}`, url: sign.url }];

  let title = data.title;
  if (!title) {
    const base = `${sign.nameFi} (${sign.code})`;
    title = [`${base} – liikennemerkin merkitys`, `${base} – liikennemerkki`, base].find((t) => t.length <= 60) || fit(base);
  }
  const description = clip(
    data.description ||
      (sign.descFi
        ? `${sign.code} ${sign.nameFi}: ${sign.descFi} Katso merkin kuva ja nimi ruotsiksi ja englanniksi.`
        : `${sign.code} ${sign.nameFi} kuuluu ryhmään ${group.fi.toLowerCase()}. Katso merkin kuva ja nimi ruotsiksi ja englanniksi.`)
  );

  const relatedSigns = [...codes(data.related).map((c) => byCode.get(c)).filter(Boolean)];
  for (const s of neighbours(sign, 6)) if (relatedSigns.length < 4 && !relatedSigns.includes(s)) relatedSigns.push(s);
  const related = relatedSigns
    .map((s) => `<li><a href="${s.url}">${signImage(s, { alt: '' })}<span>${esc(s.code)} ${esc(s.nameFi)}</span></a></li>`)
    .join('');

  const i = group.signs.indexOf(sign);
  const prev = group.signs[i - 1];
  const next = group.signs[i + 1];
  const pager = `<nav class="pager" aria-label="Ryhmän muut merkit">${prev ? `<a href="${prev.url}" rel="prev">‹ ${esc(prev.code)} ${esc(prev.nameFi)}</a>` : '<span></span>'}${next ? `<a href="${next.url}" rel="next">${esc(next.code)} ${esc(next.nameFi)} ›</a>` : ''}</nav>`;

  const body = `<div class="wrap">
${breadcrumb(crumbs)}
<article>
<header class="page-head">
<p class="meta">Liikennemerkki ${esc(sign.code)} · <a href="${group.url}">${esc(group.fi)}</a></p>
<h1>${esc(sign.nameFi)} (${esc(sign.code)})</h1>
</header>
<div class="sign-hero">
<figure><span class="tile">${signImage(sign, { lazy: false })}</span><figcaption>${SIGN_CREDIT}</figcaption></figure>
<div>
<table class="names">
<tr><th scope="row">Tunnus</th><td>${esc(sign.code)}</td></tr>
<tr><th scope="row">Suomeksi</th><td>${esc(sign.nameFi)}</td></tr>
<tr><th scope="row">Ruotsiksi</th><td lang="sv">${esc(sign.nameSv)}</td></tr>
<tr><th scope="row">Englanniksi</th><td lang="en">${esc(sign.nameEn)}</td></tr>
<tr><th scope="row">Ryhmä</th><td><a href="${group.url}">${esc(group.id)} ${esc(group.fi)}</a></td></tr>
</table>
${data.summary ? `<p class="lead">${esc(data.summary)}</p>` : ''}
</div>
</div>
${adSlot('top')}
<div class="prose">
${rendered ? rendered.html : signFallback(sign)}
${signCheck(sign, data, byCode)}
<section class="related" aria-labelledby="liittyvat"><h2 id="liittyvat">Liittyvät merkit</h2><ul>${related}</ul></section>
</div>
${cta(ctx, sign.url, {
  title: 'Opettele kaikki 373 merkkiä sovelluksella',
  text: 'Teoriakoe FI -sovelluksessa on merkkihaku, muistikortit ja harjoitustehtäviä merkkiryhmittäin. Sovelluksen lataaminen on ilmaista.'
})}
${content ? sources(data.sources, data.updated) : ''}
${pager}
</article>
</div>`;

  return {
    url: sign.url,
    kind: 'sign',
    title,
    description,
    body,
    breadcrumbs: crumbs,
    noindex: !indexable,
    sitemap: 'signs',
    updated: data.updated,
    words,
    scripts: ['signCheck'],
    jsonld: [
      {
        '@type': 'ImageObject',
        contentUrl: ctx.config.origin + sign.img.src,
        name: sign.nameFi,
        caption: `${sign.code} ${sign.nameFi}`,
        creditText: 'Väylävirasto',
        creator: { '@type': 'Organization', name: 'Väylävirasto' }
      }
    ]
  };
}

export function groupRoute(group, ctx, content) {
  const data = content?.data || {};
  const crumbs = [HOME_CRUMB, HUB_CRUMB, { name: group.fi, url: group.url }];
  const grid = `<h2 id="kaikki">Kaikki ${esc(group.fi.toLowerCase())} (${group.signs.length})</h2>
<ul class="sign-grid wide">${group.signs.map((s, i) => `<li>${signCard(s, { desc: true, lazy: i > 5 })}</li>`).join('')}</ul>`;
  const rendered = content ? ctx.markdown(content.body, { signs: () => grid }) : { html: `<p>${esc(group.dfi)}</p>${grid}`, faq: [] };
  const html = rendered.html.includes('id="kaikki"') ? rendered.html : rendered.html + grid;
  const others = ctx.signData.groups
    .filter((g) => g !== group)
    .map((g) => `<li><a href="${g.url}"><span>${esc(g.id)} ${esc(g.fi)}</span></a></li>`)
    .join('');
  const body = `<div class="wrap">
${breadcrumb(crumbs)}
<article>
<header class="page-head">
<h1>${esc(data.h1 || group.fi)}</h1>
${data.lead ? `<p class="lead">${esc(data.lead)}</p>` : ''}
</header>
${adSlot('top')}
<div class="prose">${html}
<section class="related" aria-labelledby="muut-ryhmat"><h2 id="muut-ryhmat">Muut merkkiryhmät</h2><ul>${others}</ul></section>
</div>
${cta(ctx, group.url, {
  title: `Harjoittele ${group.fi.toLowerCase()} sovelluksessa`,
  text: 'Teoriakoe FI kertaa merkit ryhmittäin ja näyttää, missä ryhmässä teet eniten virheitä. Lataaminen on ilmaista, Premium on vapaaehtoinen.'
})}
${content ? sources(data.sources, data.updated) : ''}
</article>
</div>`;
  return {
    url: group.url,
    kind: 'group',
    title: data.title || fit(`${group.fi} – merkit ja merkitykset`),
    description: clip(data.description || `${group.dfi} Ryhmän ${group.id} kaikki ${group.signs.length} merkkiä kuvineen.`),
    body,
    breadcrumbs: crumbs,
    noindex: !content,
    sitemap: 'signs',
    updated: data.updated,
    faq: rendered.faq,
    scripts: []
  };
}

export function hubRoute(ctx, content) {
  const data = content.data;
  const { groups } = ctx.signData;
  const crumbs = [HOME_CRUMB, HUB_CRUMB];
  let eager = 8;
  const groupList = groups
    .map((g) => {
      const cards = g.signs
        .map((s) => {
          const terms = [s.code, s.nameFi, s.nameSv, s.nameEn].join(' ');
          return `<li data-search="${esc(terms.toLowerCase())}">${signCard(s, { lazy: eager-- <= 0 })}</li>`;
        })
        .join('');
      return `<section data-group-section id="ryhma-${g.id.toLowerCase()}" aria-labelledby="otsikko-${g.id.toLowerCase()}">
<div class="group-head"><h2 id="otsikko-${g.id.toLowerCase()}">${esc(g.id)} ${esc(g.fi)} <span class="meta">(${g.signs.length})</span></h2></div>
<p>${esc(g.dfi)} <a href="${g.url}">Lue lisää: ${esc(g.fi.toLowerCase())}</a></p>
<ul class="sign-grid">${cards}</ul>
</section>`;
    })
    .join('');
  const search = `<div class="search" role="search">
<label for="sign-search">Hae merkkiä nimellä tai tunnuksella</label>
<input id="sign-search" type="search" autocomplete="off" spellcheck="false" placeholder="esim. C37 tai pysäköinti">
<p id="search-status" class="search-status" aria-live="polite"></p>
</div>`;
  const jump = `<nav aria-label="Merkkiryhmät"><ul class="chips">${groups
    .map((g) => `<li><a href="#ryhma-${g.id.toLowerCase()}">${esc(g.id)} ${esc(g.fi)}</a></li>`)
    .join('')}</ul></nav>`;
  const rendered = ctx.markdown(content.body, {
    search: () => search,
    groups: () => `${jump}<div class="hub-groups">${groupList}</div>`
  });
  const body = `<div class="wrap">
${breadcrumb(crumbs)}
<header class="page-head">
<h1>${esc(data.h1)}</h1>
${data.lead ? `<p class="lead">${esc(data.lead)}</p>` : ''}
</header>
${adSlot('top')}
<div class="hub">${rendered.html}</div>
${cta(ctx, HUB_URL, {
  title: 'Kaikki merkit mukana puhelimessa',
  text: 'Teoriakoe FI -sovelluksessa merkit ovat käytössä myös ilman verkkoyhteyttä, ja muistikorteilla kertaat ne nopeasti. Lataaminen on ilmaista.'
})}
${sources(data.sources, data.updated)}
</div>`;
  return {
    url: HUB_URL,
    kind: 'hub',
    title: data.title,
    description: data.description,
    body,
    breadcrumbs: crumbs,
    sitemap: 'signs',
    updated: data.updated,
    faq: rendered.faq,
    scripts: ['search']
  };
}

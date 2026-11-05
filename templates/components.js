// Shared HTML pieces. Elements marked data-shared repeat on many pages by design
// and are left out of the duplicate-sentence report in `npm run check`.
import { esc, fiDate } from '../scripts/lib/text.js';

export const DISCLAIMER =
  'Teoriakoe FI on itsenäinen sovellus. Se ei ole sidoksissa Traficomiin, Ajovarmaan tai muihin viranomaisiin, eivätkä ne ole hyväksyneet sitä. Harjoituskysymykset eivät ole varsinaisen teoriakokeen kysymyksiä.';

export const SIGN_CREDIT = 'Liikennemerkkien lähde: Väylävirasto';
export const SIGN_CREDIT_URL = 'https://vayla.fi/';

export function ld(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function campaignSlug(url) {
  return url.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'etusivu';
}

export function playUrl(ctx, url) {
  const referrer = `utm_source=${ctx.config.domain}&utm_medium=web&utm_campaign=${campaignSlug(url)}`;
  return `https://play.google.com/store/apps/details?id=${ctx.config.play.package}&referrer=${encodeURIComponent(referrer)}`;
}

export function storeLinks(ctx, url) {
  const apple = ctx.config.appStore.url;
  const play = playUrl(ctx, url);
  const { appStore, googlePlay } = ctx.badges;
  const link = (href, badge, label, text, cls) =>
    badge
      ? `<a class="store-badge ${cls}" href="${esc(href)}" rel="noopener"><img src="${badge.src}" width="${badge.width}" height="${badge.height}" alt="${label}"></a>`
      : `<a class="btn btn-ghost" href="${esc(href)}" rel="noopener"><span class="visually-hidden">Lataa sovellus: </span>${text}</a>`;
  return `<div class="stores">${link(apple, appStore, 'Lataa App Storesta', 'App Store', 'apple')}${link(play, googlePlay, 'Hanki se Google Playsta', 'Google Play', 'play')}</div>`;
}

export function cta(ctx, url, { title, text }) {
  return `<aside class="cta" data-shared aria-label="Teoriakoe FI -sovellus">
<img src="${ctx.urls.icon192}" width="56" height="56" alt="" loading="lazy">
<div class="cta-body"><p class="cta-title">${title}</p><p>${text}</p>${storeLinks(ctx, url)}</div>
</aside>`;
}

export function adSlot(name) {
  return `<div class="ad-slot" data-ad-slot="${name}" aria-hidden="true"></div>`;
}

export function breadcrumb(items) {
  const last = items.length - 1;
  const li = items
    .map((item, i) =>
      i === last
        ? `<li><span aria-current="page">${esc(item.name)}</span></li>`
        : `<li><a href="${item.url}">${esc(item.name)}</a></li>`
    )
    .join('');
  return `<nav class="breadcrumb" aria-label="Murupolku"><ol>${li}</ol></nav>`;
}

export function breadcrumbLd(ctx, items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: ctx.config.origin + item.url
    }))
  };
}

export function signImage(sign, { lazy = true, alt } = {}) {
  const img = sign.img;
  return `<img src="${img.src}" width="${img.width}" height="${img.height}" alt="${esc(alt ?? sign.nameFi)}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

export function signCard(sign, { desc = false, lazy = true } = {}) {
  const text = desc && sign.descFi ? `<span class="desc">${esc(sign.descFi)}</span>` : '';
  return `<a class="sign-card" href="${sign.url}"><span class="tile">${signImage(sign, { lazy })}</span><span class="code">${esc(sign.code)}</span><span class="name">${esc(sign.nameFi)}</span>${text}</a>`;
}

export function sources(list, updated) {
  if (!list?.length && !updated) return '';
  const items = (list || [])
    .map((entry) => {
      const [title, href] = String(entry).split(/\s+\|\s+/);
      return href ? `<li><a href="${esc(href)}" rel="noopener">${esc(title)}</a></li>` : `<li>${esc(title)}</li>`;
    })
    .join('');
  const date = updated ? `<p>Päivitetty <time datetime="${updated}">${fiDate(updated)}</time></p>` : '';
  return `<section class="sources" aria-labelledby="lahteet"><h2 id="lahteet">Lähteet</h2>${items ? `<ul>${items}</ul>` : ''}${date}</section>`;
}

export function notice(html) {
  return `<div class="notice" data-shared><p>${html}</p></div>`;
}

const SCREENS = [
  ['01_home', 'Sovelluksen etusivu: harjoituskoe, pikatesti ja Pelaa ja opi'],
  ['02_mock_exam', 'Harjoituskoe, jossa kolme osiota ja yhteinen aika'],
  ['03_play_learn', 'Pelaa ja opi -kaupunki ylhäältä kuvattuna'],
  ['04_practice_explained', 'Harjoitustehtävä ja vastauksen selitys'],
  ['05_road_signs', 'Liikennemerkit ryhmittäin ja haku'],
  ['06_result', 'Harjoituskokeen tulos osioittain']
];

export function screenshots(ctx) {
  const items = SCREENS.map(([name, alt]) => {
    const set = [360, 540, 720].map((w) => `${ctx.urls.screens[`${name}-${w}`]} ${w}w`).join(', ');
    return `<li><img src="${ctx.urls.screens[`${name}-360`]}" srcset="${set}" sizes="240px" width="360" height="640" alt="${esc(alt)}" loading="lazy" decoding="async"></li>`;
  }).join('');
  return `<ul class="shots" aria-label="Kuvia sovelluksesta">${items}</ul>`;
}

// Free vs Premium, worded after the store listing. Prices are never shown.
const COMPARE = [
  ['Kaikki 373 liikennemerkkiä ja merkkihaku', 'yes', 'yes'],
  ['Teorian tiivistelmät, 14 aihetta', 'yes', 'yes'],
  ['Perussääntöjen harjoittelu', 'yes', 'yes'],
  ['Pikatesti (10 kysymystä)', '1 päivässä, lyhyillä mainoksilla jopa 3 lisää', 'yes'],
  ['Harjoituspakka', '10 korttia', 'yes'],
  ['Pelaa ja opi', '5 tilannetta päivässä, mainoksella 5 lisää', 'Koko kaupunki, 140 tilannetta'],
  ['Harjoituskoe (70 tehtävää, 30 min)', 'no', 'yes'],
  ['Kaikki 989 harjoitustehtävää', 'no', 'yes'],
  ['Harjoittelu aiheittain ja merkkiryhmittäin', 'no', 'yes'],
  ['Heikot kohdat', 'no', 'yes'],
  ['Tarkka edistyminen', 'no', 'yes'],
  ['Mainokset', 'Kyllä', 'Ei']
];

export function compareTable() {
  const cell = (v) => (v === 'yes' ? '<td class="yes">✓<span class="visually-hidden"> sisältyy</span></td>' : v === 'no' ? '<td class="no">–<span class="visually-hidden"> ei sisälly</span></td>' : `<td>${esc(v)}</td>`);
  const rows = COMPARE.map(([label, free, premium]) => `<tr><th scope="row">${esc(label)}</th>${cell(free)}${cell(premium)}</tr>`).join('');
  return `<div class="table-scroll" data-shared><table class="compare"><caption class="visually-hidden">Ilmaisversion ja Premiumin sisältö</caption><thead><tr><th scope="col">Ominaisuus</th><th scope="col">Ilmainen</th><th scope="col">Premium</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="meta" data-shared>Premium on viikko- tai kuukausitilaus, ja hinta näkyy sovelluksessa. Tilaus uusiutuu automaattisesti, kunnes perut sen App Storen tai Google Playn tililläsi.</p>`;
}

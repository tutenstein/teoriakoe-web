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
  const link = (href, badge, label, text) =>
    badge
      ? `<a class="store-badge" href="${esc(href)}" rel="noopener"><img src="${badge.src}" width="${badge.width}" height="${badge.height}" alt="${label}"></a>`
      : `<a class="btn btn-ghost" href="${esc(href)}" rel="noopener" aria-label="${label}">${text}</a>`;
  return `<div class="stores">${link(apple, appStore, 'Lataa App Storesta', 'App Store')}${link(play, googlePlay, 'Hanki se Google Playsta', 'Google Play')}</div>`;
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

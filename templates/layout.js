// Page shell: head, header, footer and the mobile download bar.
import { esc } from '../scripts/lib/text.js';
import { DISCLAIMER, SIGN_CREDIT, SIGN_CREDIT_URL, ld, breadcrumbLd, playUrl } from './components.js';

const NAV = [
  ['/liikennemerkit/', 'Liikennemerkit'],
  ['/liikennemerkkitesti/', 'Merkkitesti'],
  ['/teoriakoe/', 'Teoriakoe'],
  ['/ajokortti/b-ajokortti/', 'B-ajokortti'],
  ['/sovellus/', 'Sovellus']
];

const FOOTER = [
  ['Liikennemerkit', [
    ['/liikennemerkit/', 'Kaikki liikennemerkit'],
    ['/liikennemerkkitesti/', 'Liikennemerkkitesti'],
    ['/liikennemerkit/varoitusmerkit/', 'Varoitusmerkit'],
    ['/liikennemerkit/kielto-ja-rajoitusmerkit/', 'Kielto- ja rajoitusmerkit'],
    ['/liikennemerkit/maaraysmerkit/', 'Määräysmerkit']
  ]],
  ['Ajokortti', [
    ['/teoriakoe/', 'Teoriakoe'],
    ['/teoriakoe/kysymykset/', 'Teoriakokeen rakenne'],
    ['/teoriakoe/hinta/', 'Teoriakokeen hinta'],
    ['/teoriakoe/hylatty/', 'Teoriakoe hylätty'],
    ['/ajokortti/b-ajokortti/', 'B-ajokortti vaihe vaiheelta']
  ]],
  ['Sovellus', [
    ['/sovellus/', 'Teoriakoe FI -sovellus'],
    ['/sovellus/premium/', 'Premium'],
    ['/tuki/', 'Tuki ja UKK']
  ]],
  ['Tietoa', [
    ['/tietoa/', 'Tietoa sivustosta'],
    ['/yhteystiedot/', 'Yhteystiedot'],
    ['/tietosuoja/', 'Tietosuoja'],
    ['/kayttoehdot/', 'Käyttöehdot']
  ]]
];

function organization(ctx) {
  const { origin, name, email } = ctx.config;
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organisaatio`,
    name,
    url: `${origin}/`,
    logo: `${origin}/kuvat/teoriakoe-fi.png`,
    email
  };
}

export function layout(route, ctx) {
  const { config, urls } = ctx;
  const canonical = config.origin + route.url;
  const exists = (url) => ctx.routes.has(url);
  const navItems = NAV.filter(([url]) => exists(url))
    .map(([url, label]) => {
      const current = route.url === url || (url !== '/' && route.url.startsWith(url));
      return `<li><a href="${url}"${current ? ' aria-current="page"' : ''}>${label}</a></li>`;
    })
    .join('');
  const footerCols = FOOTER.map(([title, links]) => {
    const items = links.filter(([url]) => exists(url));
    if (!items.length) return '';
    return `<div><h2>${title}</h2><ul>${items.map(([url, label]) => `<li><a href="${url}">${label}</a></li>`).join('')}</ul></div>`;
  }).join('');

  const graph = [organization(ctx), ...(route.jsonld || [])];
  if (route.breadcrumbs?.length > 1) graph.push(breadcrumbLd(ctx, route.breadcrumbs));
  const ogImage = config.origin + (route.ogImage || urls.og);
  const robots = route.noindex ? '<meta name="robots" content="noindex,follow">' : '';
  const alternates = route.noindex
    ? ''
    : [...Object.entries(route.alternates || { fi: route.url }), ['x-default', (route.alternates || {}).fi || route.url]]
        .map(([lang, url]) => `<link rel="alternate" hreflang="${lang}" href="${config.origin + url}">`)
        .join('');
  const scripts = [urls.js.site, ...(route.scripts || []).map((name) => urls.js[name])]
    .map((src) => `<script src="${src}" defer></script>`)
    .join('');
  const sticky = route.stickyCta === false
    ? ''
    : `<div class="sticky-cta" data-shared>
<img src="${urls.icon64}" width="36" height="36" alt="">
<p><strong>Teoriakoe FI</strong><br>Harjoittele teoriakokeeseen</p>
<a class="btn btn-primary" href="/#lataa" data-store-auto data-ios="${esc(config.appStore.url)}" data-android="${esc(playUrl(ctx, route.url))}" rel="noopener">Lataa</a>
<button class="sticky-cta-close" type="button" aria-label="Sulje latauspalkki">×</button>
</div>`;

  return `<!doctype html>
<html lang="${route.lang || 'fi'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(route.title)}</title>
<meta name="description" content="${esc(route.description)}">
${route.kind === 'notfound' ? '' : `<link rel="canonical" href="${canonical}">`}
${robots}${alternates}
<meta name="apple-itunes-app" content="app-id=${config.appStore.id}">
<meta name="theme-color" content="#f5f6fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1020" media="(prefers-color-scheme: dark)">
<link rel="preload" href="${urls.fonts[400]}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${urls.fonts[800]}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${urls.css}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="${route.ogType || 'website'}">
<meta property="og:site_name" content="${config.name}">
<meta property="og:locale" content="${config.locale}">
<meta property="og:title" content="${esc(route.ogTitle || route.title)}">
<meta property="og:description" content="${esc(route.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${ld({ '@context': 'https://schema.org', '@graph': graph })}
${scripts}
</head>
<body>
<a class="skip-link" href="#sisalto">Siirry sisältöön</a>
<header class="site-header">
<div class="wrap">
<a class="brand" href="/"><img src="${urls.icon64}" width="32" height="32" alt="">${config.name}</a>
<a class="menu-toggle" href="#valikko" aria-controls="site-nav" aria-expanded="false">Valikko</a>
<nav class="site-nav" id="site-nav" aria-label="Päävalikko"><ul>${navItems}</ul></nav>
</div>
</header>
<main id="sisalto" tabindex="-1">
${route.body}
</main>
<footer class="site-footer" id="valikko">
<div class="wrap">
<nav class="footer-nav" aria-label="Sivuston osiot">${footerCols}</nav>
<div class="disclaimer" data-shared>
<p>${DISCLAIMER}</p>
<p><a href="${SIGN_CREDIT_URL}" rel="noopener">${SIGN_CREDIT}</a>.</p>
<p>© ${ctx.year} ${esc(config.publisher || config.name)} · <a href="mailto:${config.email}">${config.email}</a></p>
</div>
</div>
</footer>
${sticky}
</body>
</html>`;
}

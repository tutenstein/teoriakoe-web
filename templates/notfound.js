// 404 page with a search over page titles and sign names.

export function notFoundRoute(ctx) {
  const links = [
    ['/', 'Etusivu'],
    ['/liikennemerkit/', 'Liikennemerkit'],
    ['/liikennemerkkitesti/', 'Liikennemerkkitesti'],
    ['/teoriakoe/', 'Teoriakoe'],
    ['/ajokortti/b-ajokortti/', 'B-ajokortti']
  ]
    .filter(([url]) => ctx.routes.has(url))
    .map(([url, label]) => `<li><a href="${url}">${label}</a></li>`)
    .join('');
  const body = `<div class="wrap">
<div class="page-head">
<h1>Sivua ei löytynyt</h1>
<p class="lead">Osoite on voinut muuttua tai siinä on kirjoitusvirhe. Hae sivua tai liikennemerkkiä alta.</p>
</div>
<div class="search" role="search">
<label for="sign-search">Hae sivustolta</label>
<input id="sign-search" type="search" autocomplete="off" spellcheck="false" placeholder="esim. teoriakoe tai C37" data-index="${ctx.urls.searchIndex}">
<p id="search-status" class="search-status" aria-live="polite"></p>
<ul id="search-results" class="search-results"></ul>
</div>
<div class="prose related"><h2>Suosituimmat sivut</h2><ul>${links}</ul></div>
</div>`;
  return {
    url: '/404.html',
    kind: 'notfound',
    title: 'Sivua ei löytynyt | Teoriakoe FI',
    description: 'Hakemaasi sivua ei löytynyt Teoriakoe FI -sivustolta. Hae sivua tai liikennemerkkiä hakukentästä.',
    body,
    breadcrumbs: [],
    noindex: true,
    sitemap: null,
    scripts: ['search']
  };
}

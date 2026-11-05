// Home page. Numbers come from the store listing and stay in sync with it.
import { esc } from '../scripts/lib/text.js';
import { adSlot, notice, storeLinks, DISCLAIMER } from './components.js';

const FEATURES = [
  ['Harjoituskoe', '70 tehtävää kolmessa osiossa ja yhteinen 30 minuutin aika koerakenteen mukaisesti. Jokainen osio hyväksytään tai hylätään erikseen, ja lopuksi käyt vastaukset läpi.'],
  ['989 harjoitustehtävää', '289 sääntökysymystä, 126 riskientunnistustehtävää ja 574 kuvatehtävää. Mukana 1 247 kuvaa liikennetilanteista ajosimulaattorista ja valokuvista.'],
  ['Kaikki 373 liikennemerkkiä', 'Tieliikennelain 729/2018 mukaiset merkit ryhmissä A–I. Jokaisesta virallinen tunnus ja nimi suomeksi, ruotsiksi ja englanniksi, lisäksi haku ja muistikortit.'],
  ['Pelaa ja opi', 'Ohjaat autoa ylhäältä kuvatussa piirroskaupungissa: 140 liikennetilannetta kahdeksassa kaupunginosassa. Jokaisesta ratkaisusta saat selityksen ja säännön, eikä aikarajaa ole.'],
  ['Heikot kohdat', 'Väärin menneet kysymykset kootaan kertaukseen. Voit harjoitella myös tehtävätyypeittäin, aiheittain ja merkkiryhmittäin tai tehdä 10 kysymyksen pikatestin.'],
  ['Kolme kieltä', 'Suomi, ruotsi ja englanti. Kielen voi vaihtaa milloin tahansa, ja käännetyissä kysymyksissä näet myös alkuperäisen suomenkielisen tekstin.']
];

function screenshot(ctx, name, alt, { eager = false } = {}) {
  const set = [360, 540, 720].map((w) => `${ctx.urls.screens[`${name}-${w}`]} ${w}w`).join(', ');
  return `<img src="${ctx.urls.screens[`${name}-540`]}" srcset="${set}" sizes="(min-width: 900px) 300px, 62vw" width="540" height="960" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

export function homeRoute(page, ctx) {
  const { data } = page;
  const rendered = ctx.markdown(page.body);
  const features = FEATURES.map(([title, text]) => `<li class="card"><h3>${title}</h3><p>${text}</p></li>`).join('');
  const links = [
    ['/liikennemerkit/', 'Liikennemerkit ja niiden merkitykset', 'Kaikki 373 merkkiä kuvineen ja selityksineen.'],
    ['/liikennemerkkitesti/', 'Liikennemerkkitesti', '10 kysymystä selaimessa, tulos heti.'],
    ['/teoriakoe/', 'Teoriakoe', 'Miten koe etenee, mitä se maksaa ja mitä tehdä, jos se hylätään.'],
    ['/ajokortti/b-ajokortti/', 'B-ajokortti vaihe vaiheelta', 'Ajokorttiluvasta ajokokeeseen.']
  ]
    .filter(([url]) => ctx.routes.has(url))
    .map(([url, title, text]) => `<li class="card"><h3><a href="${url}">${title}</a></h3><p>${text}</p></li>`)
    .join('');

  const body = `<section class="hero">
<div class="wrap hero-grid">
<div>
<p class="eyebrow">Teoriakoe FI -sovellus iPhonelle ja Androidille</p>
<h1>${esc(data.h1)}</h1>
<p class="lead">${esc(data.lead)}</p>
<div id="lataa">${storeLinks(ctx, '/')}</div>
<p class="meta">Ilmainen ladata · Premium vapaaehtoinen · suomi, ruotsi, englanti</p>
</div>
<div class="hero-shot">${screenshot(ctx, '01_home', 'Teoriakoe FI -sovelluksen etusivu, jossa harjoituskoe, pikatesti ja Pelaa ja opi', { eager: true })}</div>
</div>
</section>
<section class="section">
<div class="wrap">
<h2>Mitä sovelluksessa on</h2>
<ul class="features">${features}</ul>
</div>
</section>
${links ? `<section class="section section-muted"><div class="wrap"><h2>Opiskele myös täällä</h2><ul class="features">${links}</ul></div></section>` : ''}
<section class="section">
<div class="wrap">
${adSlot('top')}
<div class="prose">${rendered.html}</div>
${notice(DISCLAIMER)}
</div>
</section>`;

  return {
    url: '/',
    kind: 'home',
    title: data.title,
    description: data.description,
    body,
    breadcrumbs: [],
    sitemap: 'core',
    updated: data.updated,
    faq: rendered.faq,
    stickyCta: false,
    scripts: [],
    jsonld: [
      {
        '@type': 'SoftwareApplication',
        name: ctx.config.name,
        description: data.description,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'iOS, Android',
        inLanguage: ['fi', 'sv', 'en'],
        url: `${ctx.config.origin}/`,
        image: ctx.config.origin + ctx.urls.icon512,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        publisher: { '@id': `${ctx.config.origin}/#organisaatio` }
      },
      {
        '@type': 'WebSite',
        '@id': `${ctx.config.origin}/#sivusto`,
        name: ctx.config.name,
        url: `${ctx.config.origin}/`,
        inLanguage: 'fi',
        publisher: { '@id': `${ctx.config.origin}/#organisaatio` }
      }
    ]
  };
}

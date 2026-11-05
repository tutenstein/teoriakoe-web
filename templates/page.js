// Markdown-driven pages: articles, legal pages and the sign quiz page.
import { esc } from '../scripts/lib/text.js';
import { adSlot, breadcrumb, cta, notice, sources, DISCLAIMER } from './components.js';

const DEFAULT_CTA = {
  title: 'Harjoittele Teoriakoe FI -sovelluksella',
  text: 'Sovelluksessa on harjoituskoe, 989 harjoitustehtävää ja kaikki 373 liikennemerkkiä suomeksi, ruotsiksi ja englanniksi. Lataaminen on ilmaista, Premium on vapaaehtoinen.'
};

// Puts the in-article ad slot before the second h2, if the page has one.
function withInlineAd(html) {
  const first = html.indexOf('<h2');
  const second = first === -1 ? -1 : html.indexOf('<h2', first + 3);
  return second === -1 ? html : html.slice(0, second) + adSlot('inline') + html.slice(second);
}

const QUIZ = `<div class="quiz" id="merkkitesti" data-quiz data-src="QUIZ_SRC">
<div class="quiz-card">
<p class="quiz-q">10 kysymystä, neljä vaihtoehtoa</p>
<p>Valitse, mistä merkeistä haluat kysymyksiä. Jos ryhmässä on alle kymmenen merkkiä, saat jokaisesta yhden kysymyksen. Jokaisen vastauksen jälkeen näet oikean vastauksen.</p>
<label for="quiz-group">Merkkiryhmä</label>
<p><select id="quiz-group"><option value="">Kaikki merkit</option>GROUP_OPTIONS</select></p>
<div class="quiz-actions"><button class="btn btn-primary" type="button" data-start disabled>Aloita testi</button></div>
<noscript><p>Testi toimii selaimessa ja tarvitsee JavaScriptin.</p></noscript>
</div>
</div>`;

export function pageRoute(page, ctx) {
  const { data, url } = page;
  const crumbs = ctx.crumbsFor(url, data.crumb || data.h1);
  const shortcodes = {
    quiz: () =>
      QUIZ.replace('QUIZ_SRC', ctx.urls.quizData).replace(
        'GROUP_OPTIONS',
        ctx.signData.groups.map((g) => `<option value="${g.id}">${esc(g.id)} ${esc(g.fi)} (${g.signs.length})</option>`).join('')
      ),
    disclaimer: () => notice(DISCLAIMER)
  };
  const rendered = ctx.markdown(page.body, shortcodes);
  const isArticle = (data.layout || 'article') === 'article';
  const html = isArticle ? withInlineAd(rendered.html) : rendered.html;
  const ctaBlock = data.cta === false ? '' : cta(ctx, url, { title: data.ctaTitle || DEFAULT_CTA.title, text: data.ctaText || DEFAULT_CTA.text });
  const body = `<div class="wrap">
${breadcrumb(crumbs)}
<article>
<header class="page-head">
<h1>${esc(data.h1)}</h1>
${data.lead ? `<p class="lead">${esc(data.lead)}</p>` : ''}
</header>
${data.disclaimer ? notice(DISCLAIMER) : ''}
${isArticle ? adSlot('top') : ''}
<div class="prose">${html}</div>
${ctaBlock}
${sources(data.sources, data.updated)}
</article>
</div>`;

  const jsonld = [];
  if (isArticle) {
    jsonld.push({
      '@type': 'Article',
      headline: data.h1,
      description: data.description,
      inLanguage: 'fi',
      datePublished: data.published || data.updated,
      dateModified: data.updated,
      mainEntityOfPage: ctx.config.origin + url,
      image: ctx.config.origin + ctx.urls.og,
      author: { '@id': `${ctx.config.origin}/#organisaatio` },
      publisher: { '@id': `${ctx.config.origin}/#organisaatio` }
    });
  }
  return {
    url,
    kind: data.layout || 'article',
    title: data.title,
    description: data.description,
    body,
    breadcrumbs: crumbs,
    noindex: data.noindex === true,
    sitemap: data.sitemap || 'core',
    updated: data.updated,
    faq: rendered.faq,
    ogType: isArticle ? 'article' : 'website',
    scripts: data.layout === 'quiz' ? ['quiz'] : [],
    jsonld
  };
}

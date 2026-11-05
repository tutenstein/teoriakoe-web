// Markdown rendering with the site's conventions:
// - `merkki:C37` links resolve to sign pages; other links are checked by `npm run check`
// - external links get rel="noopener"; tables scroll sideways on small screens
// - a paragraph holding only {{name}} or {{name:arg}} is replaced by a component
// - a "## Usein kysytyt kysymykset" section becomes <details> items + FAQ data
import { Marked } from 'marked';
import { esc, slugify, stripTags } from './text.js';

export const FAQ_HEADING = 'Usein kysytyt kysymykset';

export function createMarkdown({ resolveHref }) {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const url = resolveHref(href);
        const external = /^https?:\/\//.test(url);
        const titleAttr = title ? ` title="${esc(title)}"` : '';
        return `<a href="${esc(url)}"${titleAttr}${external ? ' rel="noopener"' : ''}>${text}</a>`;
      },
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = depth === 2 ? ` id="${slugify(stripTags(text))}"` : '';
        return `<h${depth}${id}>${text}</h${depth}>\n`;
      }
    }
  });

  return function render(source, shortcodes = {}) {
    let html = marked.parse(source);
    html = html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>');
    html = html.replace(/<p>\{\{(\w+)(?::([^}]*))?\}\}<\/p>/g, (all, name, arg) => {
      if (!shortcodes[name]) throw new Error(`Unknown shortcode {{${name}}}`);
      return shortcodes[name](arg?.trim());
    });
    const faq = [];
    const start = html.indexOf(`>${FAQ_HEADING}</h2>`);
    if (start !== -1) {
      const h2Start = html.lastIndexOf('<h2', start);
      const next = html.indexOf('<h2', start);
      const end = next === -1 ? html.length : next;
      const section = html.slice(h2Start, end);
      const [head, ...items] = section.split('<h3>');
      const details = items.map((item) => {
        const [question, answer] = item.split('</h3>');
        faq.push({ question: stripTags(question), answer: stripTags(answer) });
        return `<details><summary>${question}</summary>${answer.trim()}</details>`;
      });
      html = html.slice(0, h2Start) + `<section class="faq">${head}${details.join('')}</section>` + html.slice(end);
    }
    return { html, faq };
  };
}

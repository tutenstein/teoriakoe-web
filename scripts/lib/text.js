// Small text helpers shared by the build, sync and check scripts.

const FOLD = { ä: 'a', ö: 'o', å: 'a', é: 'e', ü: 'u', æ: 'ae', ø: 'o' };

// Lowercase ASCII slug: "Pysäyttäminen kielletty" -> "pysayttaminen-kielletty".
export function slugify(text, maxLength = 64) {
  let slug = text
    .toLowerCase()
    .replace(/[äöåéüæø]/g, (c) => FOLD[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    slug = slug.slice(0, slug.lastIndexOf('-') > 20 ? slug.lastIndexOf('-') : maxLength);
  }
  return slug;
}

// Sign code to a file name base: "A1.1" -> "a1.1".
export function signFileBase(code) {
  return code.toLowerCase();
}

// Sign code to a URL-safe part: "A1.1" -> "a1-1".
export function signCodeSlug(code) {
  return code.toLowerCase().replace(/\./g, '-');
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function stripTags(html) {
  return html
    .replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text) {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

// Splits plain text into normalised sentences for the duplicate report.
export function sentences(text) {
  return text
    .split(/(?<=[.!?…])\s+(?=[\p{Lu}\d"“])/u)
    .map((s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())
    .filter((s) => s.split(' ').length >= 5);
}

// Finnish date for display: 2026-11-05 -> 5.11.2026.
export function fiDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${d}.${m}.${y}`;
}

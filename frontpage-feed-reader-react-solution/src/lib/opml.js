import { uid, UNC } from '../store';
import { norm } from './feeds';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Handles nesting, lowercase attribute names, missing type, duplicates and invalid entries.
export function parseOpml(text, existing) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) return { error: 'This file is not valid OPML.' };
  const attr = (e, n) => { const a = [...e.attributes].find(a => a.name.toLowerCase() === n); return a ? a.value.trim() : ''; };
  const seen = new Set(existing.map(norm)), feeds = [], cats = []; let dup = 0, bad = 0;
  const walk = (el, cat) => [...el.children].forEach(o => {
    if (o.localName !== 'outline') return;
    const url = attr(o, 'xmlurl'), name = attr(o, 'title') || attr(o, 'text');
    if (!url && attr(o, 'type') !== 'rss') return walk(o, name || cat);
    if (!/^https?:\/\//i.test(url)) { bad++; return; }
    if (seen.has(norm(url))) { dup++; return; } seen.add(norm(url));
    feeds.push({ id: uid(), title: name || new URL(url).hostname, untitled: !name, url, cat, status: 'active', fetched: 0, fails: 0 });
    if (cat !== UNC && !cats.includes(cat)) cats.push(cat);
  });
  walk(doc.querySelector('body') || doc.documentElement, UNC);
  return { feeds, cats, dup, bad };
}

export function buildOpml(feeds, cats) {
  return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Frontpage</title></head><body>${cats.map(c => `<outline text="${esc(c)}">${feeds.filter(f => f.cat === c).map(f => `<outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}"/>`).join('')}</outline>`).join('')}</body></opml>`;
}

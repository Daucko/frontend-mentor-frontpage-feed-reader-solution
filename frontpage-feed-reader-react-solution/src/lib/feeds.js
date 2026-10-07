import { DAY, uid } from '../store';
import { COLORS } from './data';

export const PROXY = 'https://api.allorigins.win/raw?url='; // replace with your own server-side fetcher in production
export const norm = u => u.trim().replace(/\/+$/, '').toLowerCase();
export const color = id => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
export const ago = d => { const h = Math.round((Date.now() - d) / 36e5); return h < 1 ? 'now' : h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago'; };
export const day = d => { const a = new Date(d), b = new Date(), k = Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY); return k < 1 ? 'Today' : k === 1 ? 'Yesterday' : a.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }); };
const dec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const strip = h => (new DOMParser().parseFromString(h || '', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
const tx = (n, ...names) => { for (const nm of names) { const e = [...n.children].find(c => c.localName === nm); if (e && e.textContent.trim()) return e.textContent.trim(); } return ''; };

export function clean(h) {
  const d = new DOMParser().parseFromString(h || '', 'text/html');
  d.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach(e => e.remove());
  d.querySelectorAll('*').forEach(e => {
    [...e.attributes].forEach(a => { if (a.name.startsWith('on') || (/^(href|src)$/.test(a.name) && /^\s*javascript:/i.test(a.value))) e.removeAttribute(a.name); });
    if (e.tagName === 'IMG') { e.loading = 'lazy'; if (!e.hasAttribute('alt')) e.alt = ''; e.style.maxWidth = '100%'; e.style.height = 'auto'; }
    if (e.tagName === 'A') { e.target = '_blank'; e.rel = 'noopener'; }
  });
  return d.body.innerHTML;
}

// Fetch and parse an RSS 2.0, Atom or RDF feed. Throws an Error with a specific, user-readable message.
export async function loadFeed(url) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 10000);
  try {
    const r = await fetch(PROXY + encodeURIComponent(url), { signal: c.signal });
    if (!r.ok) throw new Error(r.status === 404 ? 'This feed returned a 404. It may have moved.' : 'The feed returned error ' + r.status + '.');
    const doc = new DOMParser().parseFromString(await r.text(), 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('The feed is not valid XML.');
    const nodes = [...doc.querySelectorAll('item, entry')];
    if (!nodes.length) throw new Error("No items found. This doesn't look like a valid feed URL.");
    const ft = doc.querySelector('channel > title, feed > title'); let newest = 0;
    const items = nodes.slice(0, 50).map(n => {
      const l = [...n.children].find(c => c.localName === 'link'), link = l ? (l.getAttribute('href') || l.textContent.trim()) : '';
      const title = dec(strip(tx(n, 'title'))) || 'Untitled', html = tx(n, 'encoded', 'content', 'description', 'summary');
      const date = Date.parse(tx(n, 'pubDate', 'published', 'updated', 'date')) || Date.now(); newest = Math.max(newest, date);
      return { guid: tx(n, 'guid', 'id') || link || title, title, link, html, sum: dec(strip(html)).slice(0, 220), date };
    });
    return { title: ft ? dec(ft.textContent.trim()) : '', items, newest };
  } catch (e) {
    throw e.name === 'AbortError' ? new Error('The feed took longer than 10 seconds to respond.') : e.message === 'Failed to fetch' ? new Error('Could not reach the feed. Check your connection.') : e;
  } finally { clearTimeout(t); }
}

// Pure state update: apply a fetch result (res) or an error message (err) to one feed.
export function merge(p, fid, res, err) {
  const feeds = p.feeds.map(f => f.id !== fid ? f : err
    ? { ...f, status: 'error', fails: (f.fails || 0) + 1, retryAt: Date.now() + Math.min(5 * 6e4 * 2 ** ((f.fails || 0) + 1), 216e5), error: err }
    : { ...f, title: f.untitled && res.title ? res.title : f.title, untitled: f.untitled && !res.title, status: Date.now() - res.newest > 30 * DAY ? 'stale' : 'active', fetched: Date.now(), fails: 0, error: '', retryAt: 0 });
  if (err) return { ...p, feeds };
  const have = new Set(p.items.filter(i => i.fid === fid).map(i => i.guid));
  const items = p.items.filter(i => !(i.fid === fid && i.sample)).concat(res.items.filter(i => !have.has(i.guid)).map(i => ({ ...i, id: uid(), fid, read: false, saved: false })));
  return { ...p, feeds, items };
}

import { useEffect, useState } from 'react';
import { SEED, TOPICS, BODY } from './lib/data';

export const KEY = 'frontpage.v2', UNC = 'Uncategorized', DAY = 864e5;
export const uid = () => Math.random().toString(36).slice(2, 9);

function seed() {
  const feeds = [], items = []; let n = 0;
  Object.entries(SEED).forEach(([cat, list]) => list.forEach(([title, url]) => {
    const f = { id: uid(), title, url, cat, status: 'active', fetched: 0, fails: 0 }; feeds.push(f);
    TOPICS[cat].forEach(t => { n++; items.push({ id: 's' + n, fid: f.id, title: t, sum: BODY[n % 3].replace(/<[^>]+>/g, ''), html: BODY.map(p => `<p>${p}</p>`).join(''), date: Date.now() - n * 97 * 36e3 * 3, read: n % 5 === 0, saved: false, sample: true, link: '' }); });
  }));
  return { feeds, items, cats: Object.keys(SEED), prefs: { layout: 'list', theme: 'system', interval: 30, sort: 'new' }, last: 0, lastAll: 0 };
}
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return s; } catch {} return seed(); }

// All app state lives in one object and is saved to localStorage on every change.
export function useStore() {
  const [S, setS] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }, [S]);
  return [S, setS];
}

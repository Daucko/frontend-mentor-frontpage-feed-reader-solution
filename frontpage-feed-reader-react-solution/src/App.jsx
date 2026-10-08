import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, uid, UNC, DAY } from './store';
import { loadFeed, merge, norm, color } from './lib/feeds';
import { CAT } from './lib/data';
import { parseOpml, buildOpml } from './lib/opml';
import { ItemList, DigestView, DiscoverView, ManageView, Reader } from './Views';

// icons import
import { Plus } from 'lucide-react'

const TITLES = { digest: 'Digest', all: 'All items', saved: 'Saved', manage: 'Manage feeds', discover: 'Discover' };

export default function App() {
  const [S, setS] = useStore();
  const [entered, setEntered] = useState(false), [view, setView] = useState(S.feeds.length ? 'all' : 'discover');
  const [q, setQ] = useState(''), [selId, setSelId] = useState(null), [openId, setOpenId] = useState(null);
  const [exp, setExp] = useState(() => new Set(S.cats.slice(0, 2))), [navOpen, setNavOpen] = useState(false);
  const [stat, setStat] = useState(null), [banner, setBanner] = useState(0), [live, setLive] = useState('');
  const sRef = useRef(S); sRef.current = S;
  const prevVisit = useRef(S.last), busy = useRef(false), gKey = useRef(false), qRef = useRef(null);
  useEffect(() => { setS(p => ({ ...p, last: Date.now() })); }, []);

  const fmap = useMemo(() => new Map(S.feeds.map(f => [f.id, f])), [S.feeds]);
  const cats = useMemo(() => S.feeds.some(f => f.cat === UNC) ? [...S.cats, UNC] : S.cats, [S.feeds, S.cats]);
  const cc = useMemo(() => new Map(cats.map((c, i) => [c, CAT[i % CAT.length]])), [cats]);
  const catOf = i => (fmap.get(i.fid) || {}).cat;
  const unread = pred => S.items.filter(i => !i.read && pred(i)).length;
  const special = ['discover', 'manage'].includes(view);

  const digest = useMemo(() => {
    const since = prevVisit.current && Date.now() - prevVisit.current > 36e5 ? prevVisit.current : Date.now() - 2 * DAY;
    const groups = cats.map(c => ({ c, all: S.items.filter(i => catOf(i) === c && i.date > since && !i.read).sort((a, b) => b.date - a.date) })).filter(g => g.all.length);
    groups.forEach(g => { g.show = g.all.slice(0, 3); });
    return { groups, flat: groups.flatMap(g => g.show), fromVisit: since === prevVisit.current };
  }, [S.items, cats, fmap]);
  const list = useMemo(() => {
    if (view === 'digest') return digest.flat; if (special) return [];
    const ql = q.toLowerCase(), dir = S.prefs.sort === 'old' ? 1 : -1;
    return S.items.filter(i => (view === 'all' || (view === 'saved' ? i.saved : view[0] === 'f' ? i.fid === view.slice(2) : catOf(i) === view.slice(2))) && (!ql || (i.title + i.sum + (fmap.get(i.fid) || {}).title).toLowerCase().includes(ql))).sort((a, b) => dir * (a.date - b.date));
  }, [S.items, S.prefs.sort, view, q, digest, fmap]);

  /* ---- actions ---- */
  const patch = fn => setS(p => fn(p));
  const toggle = (id, k) => patch(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [k]: !i[k] } : i) }));
  const go = v => { setView(v); setSelId(null); setNavOpen(false); setOpenId(null); };
  const openItem = id => { setOpenId(id); setSelId(id); patch(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, read: true } : i) })); };
  const step = d => {
    if (!list.length) return; const n = Math.max(0, Math.min(list.length - 1, list.findIndex(i => i.id === selId) + d)), id = list[n].id;
    setSelId(id); if (openId) openItem(id);
    requestAnimationFrame(() => { const el = document.querySelector(`[data-id="${id}"]`); if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); } });
  };
  const fetchOne = async (f, manual) => {
    if (!manual && f.retryAt > Date.now()) return { added: 0 };
    try {
      const res = await loadFeed(f.url), have = new Set(sRef.current.items.filter(i => i.fid === f.id).map(i => i.guid));
      patch(p => merge(p, f.id, res)); return { added: res.items.filter(i => !have.has(i.guid)).length };
    } catch (e) { patch(p => merge(p, f.id, null, e.message)); return { added: 0, error: e.message }; }
  };
  const fetchMany = async (fs, manual) => {
    const queue = [...fs]; let n = 0, bad = 0;
    await Promise.all([0, 1, 2, 3].map(async () => { while (queue.length) { const r = await fetchOne(queue.shift(), manual); n += r.added; if (r.error) bad++; } }));
    return { n, bad };
  };
  const refreshAll = async manual => {
    if (busy.current) return; busy.current = true; setStat('busy');
    const { n } = await fetchMany(sRef.current.feeds, manual);
    busy.current = false; patch(p => ({ ...p, lastAll: Date.now() })); setStat({ t: Date.now(), n }); setBanner(n);
  };
  const rf = useRef(); rf.current = refreshAll;
  useEffect(() => { if (entered && Date.now() - sRef.current.lastAll > 5 * 6e4) rf.current(false); }, [entered]);
  useEffect(() => { const t = setInterval(() => { const s = sRef.current; if (s.prefs.interval && Date.now() - s.lastAll > s.prefs.interval * 6e4) rf.current(false); }, 6e4); return () => clearInterval(t); }, []);
  useEffect(() => { const t = S.prefs.theme; if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; }, [S.prefs.theme]);

  const A = {
    addFeed: async (url, cat) => {
      if (sRef.current.feeds.some(f => norm(f.url) === norm(url))) return 'You already follow this feed.';
      const f = { id: uid(), title: new URL(url).hostname, untitled: true, url, cat, status: 'active', fetched: 0, fails: 0 };
      patch(p => ({ ...p, feeds: [...p.feeds, f] })); const r = await fetchOne(f, true);
      if (r.error) { patch(p => ({ ...p, feeds: p.feeds.filter(x => x.id !== f.id) })); return r.error; }
      return `Added the feed with ${r.added} items.`;
    },
    follow: async (list, cat) => {
      const fs = list.map(([title, url]) => ({ id: uid(), title, url, cat, status: 'active', fetched: 0, fails: 0 }));
      patch(p => ({ ...p, cats: p.cats.includes(cat) ? p.cats : [...p.cats, cat], feeds: [...p.feeds, ...fs] }));
      const { bad } = await fetchMany(fs, true);
      return `Followed ${fs.length} feed${fs.length > 1 ? 's' : ''}${bad ? `. ${bad} could not load yet. Retry them in Manage.` : '.'}`;
    },
    importOpml: async file => {
      const r = parseOpml(await file.text(), sRef.current.feeds.map(f => f.url)); if (r.error) return r.error;
      patch(p => ({ ...p, feeds: [...p.feeds, ...r.feeds], cats: [...p.cats, ...r.cats.filter(c => !p.cats.includes(c))] })); fetchMany(r.feeds, true);
      return `${r.feeds.length} feeds added, ${r.dup} duplicates skipped, ${r.bad} invalid. Checking for dead feeds now.`;
    },
    exportOpml: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buildOpml(S.feeds, cats)], { type: 'text/x-opml' })); a.download = 'frontpage.opml'; a.click(); },
    setInterval: v => patch(p => ({ ...p, prefs: { ...p.prefs, interval: v } })),
    setCat: (id, c) => patch(p => ({ ...p, feeds: p.feeds.map(f => f.id === id ? { ...f, cat: c } : f) })),
    retry: id => fetchOne(sRef.current.feeds.find(f => f.id === id), true),
    rename: (id, t) => patch(p => ({ ...p, feeds: p.feeds.map(f => f.id === id ? { ...f, title: t, untitled: false } : f) })),
    remove: id => patch(p => ({ ...p, feeds: p.feeds.filter(f => f.id !== id), items: p.items.filter(i => i.fid !== id) })),
    addCat: c => patch(p => c && c !== UNC && !p.cats.includes(c) ? { ...p, cats: [...p.cats, c] } : p),
    renCat: (o, n) => patch(p => n && !p.cats.includes(n) ? { ...p, cats: p.cats.map(c => c === o ? n : c), feeds: p.feeds.map(f => f.cat === o ? { ...f, cat: n } : f) } : p),
    delCat: c => patch(p => ({ ...p, cats: p.cats.filter(x => x !== c), feeds: p.feeds.map(f => f.cat === c ? { ...f, cat: UNC } : f) })),
    moveCat: (i, d) => patch(p => { const c = [...p.cats]; [c[i], c[i + d]] = [c[i + d], c[i]]; return { ...p, cats: c }; })
  };

  /* ---- keyboard ---- */
  const K = useRef(); K.current = { list, selId, view, step, openItem, toggle, go };
  useEffect(() => {
    const onKey = e => {
      const k = K.current; if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.matches('input,select,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
      if (gKey.current) { gKey.current = false; const v = { h: 'digest', a: 'all', s: 'saved', f: 'manage', d: 'discover' }[e.key]; if (v) k.go(v); return; }
      const cur = k.list.find(i => i.id === k.selId);
      if (e.key === 'j') k.step(1); else if (e.key === 'k') k.step(-1);
      else if ((e.key === 'o' || e.key === 'Enter') && cur) k.openItem(cur.id);
      else if (e.key === 'm' && cur) k.toggle(cur.id, 'read'); else if (e.key === 's' && cur) k.toggle(cur.id, 'saved');
      else if (e.key === 'g') gKey.current = true; else if (e.key === '/') { e.preventDefault(); qRef.current.focus(); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!entered) return (
    <section id="landing">
      <header className="l-head"><span className="logo">Frontpage</span></header>
      <main className="hero">
        <h1>Every blog you follow, on one calm page.</h1>
        <p>Add the dev, design and AI sources you read. Frontpage keeps them sorted by category, tracks what you've read, and gets out of the way.</p>
        <div className="cta"><button className="btn primary" onClick={() => setEntered(true)}>Open dashboard</button></div>
        <ul className="features">
          {[['Categories with counts', 'Frontend, Design, DevOps and AI, each with its own unread total.'], ['Three layouts', 'Switch between a standard list, a compact list and cards.'], ['Keyboard first', 'Move with j and k, open with o, save with s, search with /.'], ['Reader view', 'Read in Georgia at a comfortable width, without leaving the page.']].map(([h, p]) => <li key={h}><h2>{h}</h2><p>{p}</p></li>)}
        </ul>
      </main>
    </section>
  );

  const bad = S.feeds.filter(f => f.status === 'error').length, tab = ['digest', 'manage', 'discover'].includes(view) ? view : 'all';
  const row = (key, label, n) => <li key={key}><button className="nav-btn" aria-current={view === key ? 'page' : undefined} onClick={() => go(key)}><span className="lbl">{label}</span><span className="count">{n > 99 ? '99+' : n}</span></button></li>;
  const openItemObj = openId && S.items.find(i => i.id === openId);
  const title = TITLES[view] || (view[0] === 'f' ? (fmap.get(view.slice(2)) || {}).title : view.slice(2));
  const empty = q ? 'No results. Check the spelling or try a different term.' : view === 'saved' ? 'Nothing saved yet. Press s on any item to keep it here.' : 'No items here yet. Find feeds to follow in Discover.';
  const theme = S.prefs.theme, nextTheme = { system: 'light', light: 'dark', dark: 'system' }[theme];

  return (
    <>
      <a className="skip" href="#list">Skip to items</a>
      <div id="app" className={openItemObj ? 'split' : ''}>
        <header id="top">
          <div className="logo"><span className="mark" aria-hidden="true" /><span className="wm">Frontpage</span></div>
          <nav className="tabs" aria-label="Main">
            {[['all', 'Feed'], ['digest', 'Digest'], ['discover', 'Discover'], ['manage', 'Manage']].map(([v, t]) => <button key={v} aria-current={tab === v ? 'page' : undefined} onClick={() => go(v)}>{t}</button>)}
          </nav>
          <div className="top-r">
            <div className="search"><input ref={qRef} type="search" placeholder="Search articles..." aria-label="Search items" value={q}
              onChange={e => { setQ(e.target.value); setSelId(null); if (['digest', 'manage'].includes(view)) setView('all'); }} /><kbd aria-hidden="true">/</kbd></div>
            <button className="sq" aria-label="Add a feed" onClick={() => go('manage')}>< Plus size={15} /></button>
            <button className="btn small" aria-label={`Theme: ${theme}. Change theme`} onClick={() => patch(p => ({ ...p, prefs: { ...p.prefs, theme: nextTheme } }))}>{theme[0].toUpperCase() + theme.slice(1)}</button>
          </div>
        </header>

        <aside id="nav" aria-label="Sources" className={navOpen ? 'open' : ''}>
          <nav>
            <ul>{row('all', 'All items', unread(() => 1))}{row('saved', 'Saved', S.items.filter(i => i.saved).length)}</ul>
            <h2 className="nav-h">CATEGORIES</h2>
            <ul>{cats.map(c => {
              const open = exp.has(c), n = unread(i => catOf(i) === c);
              return [
                <li key={c}><button className="nav-btn" aria-expanded={open} aria-current={view === 'c:' + c ? 'page' : undefined}
                  onClick={() => { setExp(s => { const t = new Set(s); if (view === 'c:' + c && t.has(c)) t.delete(c); else t.add(c); return t; }); go('c:' + c); }}>
                  <span className="lbl"><i className="cdot" style={{ background: cc.get(c) }} />{c}</span><span className="count">{n > 99 ? '99+' : n}</span></button></li>,
                ...(open ? S.feeds.filter(f => f.cat === c).map(f => <li key={f.id}><button className="nav-btn sub" aria-current={view === 'f:' + f.id ? 'page' : undefined} onClick={() => go('f:' + f.id)}>
                  <span className="lbl"><i className="fav" style={{ background: color(f.id) }} aria-hidden="true">{(f.title || '?')[0]}</i>{f.title}</span><span className="count">{unread(i => i.fid === f.id)}</span></button></li>) : [])
              ];
            })}</ul>
          </nav>
          <button className="health" onClick={() => go('manage')}>{bad ? <><span className="st-error" aria-hidden="true">✕</span> {bad} feed{bad > 1 ? 's' : ''} failing</> : <><span className="st-active" aria-hidden="true">✓</span> All feeds healthy</>}</button>
          <span className="stat">{stat === 'busy' ? 'Refreshing…' : stat ? `Updated ${new Date(stat.t).toLocaleTimeString([], { timeStyle: 'short' })} · ${stat.n} new item${stat.n === 1 ? '' : 's'}` : ''}</span>
        </aside>

        <main id="feed" className={special ? 'manage' : ''}>
          <div className="bar">
            <button className="icon menu" aria-label="Toggle sources" onClick={() => setNavOpen(o => !o)}>☰</button>
            <div className="ttl"><h1>{title}</h1><span className="muted">{special ? '' : list.filter(i => !i.read).length + ' unread'}</span></div>
            <div className="seg" role="group" aria-label="Layout">
              {[['list', '☰', 'List'], ['cards', '▦', 'Cards'], ['compact', '≡', 'Compact']].map(([v, g, t]) => <button key={v} aria-pressed={S.prefs.layout === v} aria-label={t} title={t} onClick={() => patch(p => ({ ...p, prefs: { ...p.prefs, layout: v } }))}>{g}</button>)}
            </div>
            <button className="btn small" id="sort" onClick={() => patch(p => ({ ...p, prefs: { ...p.prefs, sort: p.prefs.sort === 'old' ? 'new' : 'old' } }))}>{S.prefs.sort === 'old' ? 'Oldest' : 'Newest'}</button>
            <button className="btn small" onClick={() => refreshAll(true)}>Refresh</button>
            <button className="btn small" id="markall" onClick={() => { const ids = new Set(list.map(i => i.id)); patch(p => ({ ...p, items: p.items.map(i => ids.has(i.id) ? { ...i, read: true } : i) })); setLive('All items marked as read'); }}>Mark all read</button>
          </div>
          {banner > 0 && <button className="banner" onClick={() => { setBanner(0); window.scrollTo({ top: 0 }); }}>↑ {banner} new item{banner === 1 ? '' : 's'} since your last refresh</button>}
          {view === 'discover' ? <DiscoverView S={S} q={q} A={A} />
            : view === 'manage' ? <ManageView S={S} cats={cats} A={A} />
            : view === 'digest' ? <DigestView digest={digest} fmap={fmap} cc={cc} selId={selId} onOpen={openItem} onMore={c => go('c:' + c)} fromVisit={digest.fromVisit} />
            : <ItemList list={list} fmap={fmap} cc={cc} selId={selId} onOpen={openItem} layout={S.prefs.layout} empty={empty} />}
        </main>

        {openItemObj && <Reader item={openItemObj} feed={fmap.get(openItemObj.fid) || { title: '', cat: '' }} onBack={() => setOpenId(null)} onStep={step} onSave={() => toggle(openItemObj.id, 'saved')} />}
      </div>
      <div className="sr" aria-live="polite">{live}</div>
    </>
  );
}

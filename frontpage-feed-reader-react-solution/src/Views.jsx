import { useState } from 'react';
import { ago, clean, color, day, norm } from './lib/feeds';
import { CATALOG } from './lib/data';
import { UNC } from './store';

export function Item({ i, feed, cc, selected, onOpen }) {
  return (
    <li className={'item' + (i.read ? ' read' : '')} data-id={i.id} role="button" tabIndex={0} aria-selected={selected}
      onClick={() => onOpen(i.id)} onKeyDown={e => e.key === 'Enter' && onOpen(i.id)}>
      <span className="dot" aria-hidden="true" />
      <div>
        <h3>{!i.read && <span className="sr">Unread: </span>}{i.title}</h3>
        <div className="meta">
          <span className="fav" style={{ background: color(i.fid) }} aria-hidden="true">{(feed.title || '?')[0]}</span>
          <span>{feed.title}</span><time title={new Date(i.date).toLocaleString()}>{ago(i.date)}</time>
          {i.saved && <span className="saved">Saved</span>}
        </div>
        <p className="sum">{i.sum}</p>
        {feed.cat && <span className="chip" style={{ '--c': cc.get(feed.cat) || '#64748b' }}>{feed.cat}</span>}
      </div>
    </li>
  );
}

export function ItemList({ list, fmap, cc, selId, onOpen, layout, empty }) {
  let last = '';
  return (
    <ul id="list" className={'list ' + layout} tabIndex={-1}>
      {list.length ? list.map(i => {
        const d = day(i.date), head = d !== last ? <li key={'d' + d} className="day">{d}</li> : null; last = d;
        return [head, <Item key={i.id} i={i} feed={fmap.get(i.fid) || { title: '' }} cc={cc} selected={selId === i.id} onOpen={onOpen} />];
      }) : <li className="empty">{empty}</li>}
    </ul>
  );
}

export function DigestView({ digest, fmap, cc, selId, onOpen, onMore, fromVisit }) {
  const { groups } = digest;
  return (
    <ul id="list" className="list" tabIndex={-1}>
      {groups.length ? <>
        <li className="empty" style={{ paddingBottom: 0 }}>{fromVisit ? 'Unread since your last visit' : 'Unread from the last 48 hours'}, top three per category.</li>
        {groups.map(g => [
          <li key={'g' + g.c} className="grp"><span>{g.c}</span>{g.all.length > 3 && <button className="btn small" onClick={() => onMore(g.c)}>{g.all.length - 3} more</button>}</li>,
          ...g.show.map(i => <Item key={i.id} i={i} feed={fmap.get(i.fid) || { title: '' }} cc={cc} selected={selId === i.id} onOpen={onOpen} />)
        ])}
      </> : <li className="empty">You are all caught up. Open Feed to browse everything.</li>}
    </ul>
  );
}

export function Reader({ item, feed, onBack, onStep, onSave }) {
  return (
    <article id="reader" aria-label="Reader">
      <div className="inner">
        <button className="btn small" onClick={onBack}>Back to list</button>
        <h2 style={{ marginTop: 'var(--space-5)' }}>{item.title}</h2>
        <div className="meta"><span>{feed.title}</span><time>{new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time><span>{feed.cat}</span></div>
        <div dangerouslySetInnerHTML={{ __html: clean(item.html) || '<p>This feed only provides a title. Open the original to read more.</p>' }} />
        <div className="r-actions">
          <button className="btn small" onClick={() => onStep(-1)}>Previous</button>
          <button className="btn small" onClick={() => onStep(1)}>Next</button>
          <button className="btn small" onClick={onSave}>{item.saved ? 'Remove from saved' : 'Save'}</button>
          {item.link && <a className="btn small" href={item.link} target="_blank" rel="noopener">Open original</a>}
        </div>
      </div>
    </article>
  );
}

export function DiscoverView({ S, q, A }) {
  const [msg, setMsg] = useState(''), have = new Set(S.feeds.map(f => norm(f.url))), ql = q.toLowerCase();
  const run = async (list, cat) => { setMsg('Adding feeds…'); setMsg(await A.follow(list, cat)); };
  const secs = Object.entries(CATALOG).map(([cat, list]) => {
    const L = list.filter(([t, u]) => !ql || (t + cat + u).toLowerCase().includes(ql)); if (!L.length) return null;
    const todo = L.filter(([, u]) => !have.has(norm(u)));
    return (
      <section key={cat}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><h2>{cat}</h2>
          {todo.length ? <button className="btn small" onClick={() => run(todo, cat)}>Follow all ({todo.length})</button> : <span className="muted">Following all</span>}</div>
        <ul>{L.map(([t, u]) => <li key={u} className="frow"><div><b>{t}</b><br /><small>{new URL(u).hostname}</small></div>
          {have.has(norm(u)) ? <span className="muted">Following</span> : <button className="btn small" aria-label={'Follow ' + t} onClick={() => run([[t, u]], cat)}>Follow</button>}</li>)}</ul>
      </section>
    );
  });
  return (
    <div id="manage">
      <section><h2>Find feeds to follow</h2><p className="msg">Follow a whole starter pack or pick feeds one at a time. The search box filters this list. To add any other feed by URL, use Manage.</p><p className="msg" role="status">{msg}</p></section>
      {secs.some(Boolean) ? secs : <section><p className="msg">No feeds match your search. Check the spelling, or add the feed by URL in Manage.</p></section>}
    </div>
  );
}

const ST = { active: '✓ Healthy', stale: '! Stale', error: '✕ Error' };
export function ManageView({ S, cats, A }) {
  const [addMsg, setAddMsg] = useState(''), [impMsg, setImpMsg] = useState(''), [newCat, setNewCat] = useState('');
  const h = { active: 0, stale: 0, error: 0 }; S.feeds.forEach(f => h[f.status]++);
  return (
    <div id="manage">
      <section><h2>Add a feed</h2>
        <form className="row" onSubmit={async e => { e.preventDefault(); const d = new FormData(e.target); setAddMsg('Checking feed…'); const m = await A.addFeed(d.get('u'), d.get('c')); setAddMsg(m); if (m.startsWith('Added')) e.target.reset(); }}>
          <label>Feed URL<input name="u" type="url" required placeholder="https://example.com/feed.xml" /></label>
          <label>Category<select name="c" defaultValue={cats[0]}>{[...cats, ...(cats.includes(UNC) ? [] : [UNC])].map(c => <option key={c}>{c}</option>)}</select></label>
          <button className="btn primary">Add feed</button></form><p className="msg" role="status">{addMsg}</p></section>
      <section><h2>Import and export</h2><div className="row"><label className="btn" htmlFor="opml">Import OPML</label>
        <input id="opml" type="file" accept=".opml,.xml" hidden onChange={async e => { const f = e.target.files[0]; if (f) setImpMsg(await A.importOpml(f)); e.target.value = ''; }} />
        <button className="btn" onClick={A.exportOpml}>Export OPML</button></div><p className="msg" role="status">{impMsg}</p></section>
      <section><h2>Refresh</h2><div className="row"><label>Auto-refresh<select value={S.prefs.interval} onChange={e => A.setInterval(+e.target.value)}>
        {[[15, 'Every 15 minutes'], [30, 'Every 30 minutes'], [60, 'Every hour'], [0, 'Manual only']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label></div>
        <p className="msg"><span className="st-active">✓ {h.active} healthy</span> · <span className="st-stale">! {h.stale} stale</span> · <span className="st-error">✕ {h.error} failing</span></p></section>
      <section><h2>Categories</h2>
        <form className="row" onSubmit={e => { e.preventDefault(); A.addCat(newCat.trim()); setNewCat(''); }}><label>New category<input required value={newCat} onChange={e => setNewCat(e.target.value)} /></label><button className="btn">Add category</button></form>
        <ul>{S.cats.map((c, i) => <li key={c} className="frow"><b>{c}</b><span className="acts" style={{ gridColumn: 'auto' }}>
          <button className="btn small" disabled={!i} aria-label={`Move ${c} up`} onClick={() => A.moveCat(i, -1)}>Up</button>
          <button className="btn small" disabled={i === S.cats.length - 1} aria-label={`Move ${c} down`} onClick={() => A.moveCat(i, 1)}>Down</button>
          <button className="btn small" onClick={() => { const t = prompt('Category name', c); if (t) A.renCat(c, t.trim()); }}>Rename</button>
          <button className="btn small" onClick={() => confirm(`Delete ${c}? Its feeds move to Uncategorized.`) && A.delCat(c)}>Delete</button></span></li>)}</ul></section>
      <section><h2>Feeds ({S.feeds.length})</h2><ul>{S.feeds.map(f => <li key={f.id} className="frow">
        <div><b>{f.title}</b> <span className={'st-' + f.status} aria-label={'Feed status: ' + f.status}>{ST[f.status]}</span><br /><small>{f.url}</small><br />
          <small>{f.fetched ? 'Last fetched ' + ago(f.fetched) : 'Not fetched yet'}{f.error ? ' · ' + f.error : ''}</small></div>
        <select value={f.cat} aria-label={'Category for ' + f.title} onChange={e => A.setCat(f.id, e.target.value)}>{[...cats, ...(cats.includes(UNC) ? [] : [UNC])].map(c => <option key={c}>{c}</option>)}</select>
        <span className="acts"><button className="btn small" onClick={() => A.retry(f.id)}>Retry</button>
          <button className="btn small" onClick={() => { const t = prompt('Feed title', f.title); if (t && t.trim()) A.rename(f.id, t.trim()); }}>Rename</button>
          <button className="btn small" onClick={() => confirm(`Remove ${f.title}? Its items and saved articles will be deleted.`) && A.remove(f.id)}>Remove</button></span></li>)}</ul></section>
    </div>
  );
}

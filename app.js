(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );

  const PROXY = 'https://api.allorigins.win/raw?url='; // swap for your own server-side fetcher in production
  const KEY = 'frontpage.v2',
    UNC = 'Uncategorized',
    DAY = 864e5;

  const SEED = {
    Frontend: [
      ['CSS-Tricks', 'https://css-tricks.com/feed/'],
      ['Smashing Magazine', 'https://www.smashingmagazine.com/feed/'],
      ['Josh W. Comeau', 'https://www.joshwcomeau.com/rss.xml'],
      ['Kent C. Dodds', 'https://kentcdodds.com/blog/rss.xml'],
      ['web.dev', 'https://web.dev/feed.xml'],
      ['MDN Blog', 'https://developer.mozilla.org/en-US/blog/rss.xml'],
    ],
    Design: [
      ['Sidebar.io', 'https://sidebar.io/feed.xml'],
      ['Nielsen Norman Group', 'https://www.nngroup.com/feed/rss/'],
      ['Figma Blog', 'https://www.figma.com/blog/feed/'],
      ['A List Apart', 'https://alistapart.com/main/feed/'],
      ['UX Collective', 'https://uxdesign.cc/feed'],
    ],
    'Backend & DevOps': [
      ['Cloudflare Blog', 'https://blog.cloudflare.com/rss/'],
      ['Vercel Blog', 'https://vercel.com/atom'],
      ['The GitHub Blog', 'https://github.blog/feed/'],
      ['Netlify Blog', 'https://www.netlify.com/blog/index.xml'],
    ],
    'General Tech': [
      ['The Pragmatic Engineer', 'https://blog.pragmaticengineer.com/rss/'],
      ['Hacker News Best', 'https://hnrss.org/best'],
    ],
    'AI & ML': [
      ["Simon Willison's Weblog", 'https://simonwillison.net/atom/everything/'],
      ['Hugging Face Blog', 'https://huggingface.co/blog/feed.xml'],
    ],
  };

  const TOPICS = {
    Frontend: [
      'Container queries in practice',
      'A calmer way to handle focus styles',
      'Rethinking CSS layers',
      'What changed in the latest baseline',
    ],
    Design: [
      'Designing dense interfaces that stay readable',
      'Why empty states deserve more attention',
      'Typography choices for long reading',
      'Testing navigation with five users',
    ],
    'Backend & DevOps': [
      'Cutting cold starts at the edge',
      'How we shipped a safer deploy pipeline',
      'Caching feeds with conditional requests',
      'Lessons from a week of incident reviews',
    ],
    'General Tech': [
      'How teams plan work without sprints',
      'Show: a tiny feed reader in 300 lines',
      'The cost of keeping dependencies fresh',
      'Notes on reading less and learning more',
    ],
    'AI & ML': [
      'Summaries that cite their sources',
      'Running small models locally',
      'Evaluating prompts with real data',
      'Notes on tool use and long context',
    ],
  };

  const CATALOG = JSON.parse(JSON.stringify(SEED));
  CATALOG.Frontend.push(['Overreacted', 'https://overreacted.io/rss.xml']);
  CATALOG['General Tech'].push(
    ['Julia Evans', 'https://jvns.ca/atom.xml'],
    ['Daring Fireball', 'https://daringfireball.net/feeds/main'],
  );

  const BODY = [
    'Sample content shown until this feed loads. Real items replace it after the first successful refresh.',
    'Reader view uses a serif face at a narrow measure. Inline <code>code</code> uses the monospace stack from the brand kit.',
    'Use j and k to move, o to open, m to toggle read, and s to save.',
  ];
  const COLORS = [
    '#2563eb',
    '#16a34a',
    '#ca8a04',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
  ];
  const CAT = [
    '#2563eb',
    '#ec4899',
    '#f59e0b',
    '#6366f1',
    '#8b5cf6',
    '#14b8a6',
    '#ef4444',
  ];

  let CC = new Map();
  const day = (d) => {
    const a = new Date(d),
      b = new Date(),
      k = Math.round(
        (new Date(b.getFullYear(), b.getMonth(), b.getDate()) -
          new Date(a.getFullYear(), a.getMonth(), a.getDate())) /
          DAY,
      );
    return k < 1
      ? 'Today'
      : k === 1
        ? 'Yesterday'
        : a.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
  };

  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 9);
  const norm = (u) => u.trim().replace(/\/+$/, '').toLowerCase();
  const strip = (h) =>
    (
      new DOMParser().parseFromString(h || '', 'text/html').body.textContent ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();

  function seed() {
    const feeds = [],
      items = [];
    let n = 0;
    Object.entries(SEED).forEach(([cat, list]) =>
      list.forEach(([title, url]) => {
        const f = {
          id: uid(),
          title,
          url,
          cat,
          status: 'active',
          fetched: 0,
          fails: 0,
        };
        feeds.push(f);
        TOPICS[cat].forEach((t) => {
          n++;
          items.push({
            id: 's' + n,
            fid: f.id,
            title: t,
            sum: BODY[n % 3].replace(/<[^>]+>/g, ''),
            html: BODY.map((p) => `<p>${p}</p>`).join(''),
            date: Date.now() - n * 97 * 36e3 * 3,
            read: n % 5 === 0,
            saved: false,
            sample: true,
            link: '',
          });
        });
      }),
    );
    return {
      feeds,
      items,
      cats: Object.keys(SEED),
      prefs: { layout: 'list', theme: 'system', interval: 30 },
      last: 0,
      lastAll: 0,
    };
  }

  let S;

  try {
    S = JSON.parse(localStorage.getItem(KEY));
  } catch {}

  S = S || seed();
  const prevVisit = S.last;
  S.last = Date.now();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch {}
  };
  const st = {
    view: S.feeds.length ? 'all' : 'discover',
    q: '',
    sel: -1,
    open: null,
    g: false,
    busy: false,
    exp: new Set(S.cats.slice(0, 2)),
  };

  const live = $('#live'),
    say = (m) => {
      live.textContent = m;
    };
  const fmap = () => new Map(S.feeds.map((f) => [f.id, f]));
  const cats = () =>
    S.feeds.some((f) => f.cat === UNC) ? [...S.cats, UNC] : S.cats;
  const catOf = (i, m) => (m.get(i.fid) || {}).cat;
  const color = (id) =>
    COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const ago = (d) => {
    const h = Math.round((Date.now() - d) / 36e5);
    return h < 1 ? 'now' : h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
  };

  /* ---------- parsing ---------- */
  function clean(h) {
    const d = new DOMParser().parseFromString(h || '', 'text/html');
    d.querySelectorAll(
      'script,style,iframe,object,embed,form,link,meta',
    ).forEach((e) => e.remove());
    d.querySelectorAll('*').forEach((e) => {
      [...e.attributes].forEach((a) => {
        if (
          a.name.startsWith('on') ||
          (/^(href|src)$/.test(a.name) && /^\s*javascript:/i.test(a.value))
        )
          e.removeAttribute(a.name);
      });
      if (e.tagName === 'IMG') {
        e.loading = 'lazy';
        if (!e.hasAttribute('alt')) e.alt = '';
        e.style.maxWidth = '100%';
        e.style.height = 'auto';
      }
      if (e.tagName === 'A') {
        e.target = '_blank';
        e.rel = 'noopener';
      }
    });
    return d.body.innerHTML;
  }
  const dec = (s) => {
    const t = document.createElement('textarea');
    t.innerHTML = s;
    return t.value;
  };

  const tx = (n, ...names) => {
    for (const nm of names) {
      const e = [...n.children].find((c) => c.localName === nm);
      if (e && e.textContent.trim()) return e.textContent.trim();
    }
    return '';
  };

  async function fetchFeed(f, manual) {
    if (!manual && f.retryAt > Date.now()) return 0;
    const c = new AbortController(),
      t = setTimeout(() => c.abort(), 10000);
    try {
      const r = await fetch(PROXY + encodeURIComponent(f.url), {
        signal: c.signal,
      });
      if (!r.ok)
        throw new Error(
          r.status === 404
            ? 'This feed returned a 404. It may have moved.'
            : 'The feed returned error ' + r.status + '.',
        );
      const doc = new DOMParser().parseFromString(await r.text(), 'text/xml');
      if (doc.querySelector('parsererror'))
        throw new Error('The feed is not valid XML.');
      const nodes = [...doc.querySelectorAll('item, entry')];
      if (!nodes.length)
        throw new Error(
          "No items found. This doesn't look like a valid feed URL.",
        );
      if (f.untitled) {
        const ft = doc.querySelector('channel > title, feed > title');
        if (ft) {
          f.title = dec(ft.textContent.trim());
          f.untitled = false;
        }
      }
      S.items = S.items.filter((i) => !(i.fid === f.id && i.sample));
      const have = new Set(
        S.items.filter((i) => i.fid === f.id).map((i) => i.guid),
      );
      let added = 0,
        newest = 0;
      nodes.slice(0, 50).forEach((n) => {
        const l = [...n.children].find((c) => c.localName === 'link');
        const link = l ? l.getAttribute('href') || l.textContent.trim() : '';
        const title = dec(strip(tx(n, 'title'))) || 'Untitled';
        const guid = tx(n, 'guid', 'id') || link || title;
        const html = tx(n, 'encoded', 'content', 'description', 'summary');
        const date =
          Date.parse(tx(n, 'pubDate', 'published', 'updated', 'date')) ||
          Date.now();
        newest = Math.max(newest, date);
        if (have.has(guid)) return;
        S.items.push({
          id: uid(),
          fid: f.id,
          guid,
          title,
          link,
          html,
          sum: dec(strip(html)).slice(0, 220),
          date,
          read: false,
          saved: false,
        });
        added++;
      });
      f.status = Date.now() - newest > 30 * DAY ? 'stale' : 'active';
      f.fetched = Date.now();
      f.fails = 0;
      f.error = '';
      f.retryAt = 0;
      return added;
    } catch (e) {
      f.status = 'error';
      f.fails = (f.fails || 0) + 1;
      f.retryAt = Date.now() + Math.min(5 * 60000 * 2 ** f.fails, 6 * 36e5);
      f.error =
        e.name === 'AbortError'
          ? 'The feed took longer than 10 seconds to respond.'
          : e.message === 'Failed to fetch'
            ? 'Could not reach the feed. Check your connection.'
            : e.message;
      return 0;
    } finally {
      clearTimeout(t);
    }
  }

  async function refreshAll(manual) {
    if (st.busy) return;
    st.busy = true;
    $('#status').textContent = 'Refreshing…';
    say('Refreshing feeds');
    let total = 0;
    const q = [...S.feeds];
    await Promise.all(
      [0, 1, 2, 3].map(async () => {
        while (q.length) total += await fetchFeed(q.shift(), manual);
      }),
    );
    S.lastAll = Date.now();
    st.busy = false;
    save();
    const ban = $('#banner');
    ban.hidden = !total;
    ban.textContent = `↑ ${total} new item${total === 1 ? '' : 's'} since your last refresh`;
    const bad = S.feeds.filter((f) => f.status === 'error').length;
    $('#status').textContent =
      `Updated ${new Date().toLocaleTimeString([], { timeStyle: 'short' })} · ${total} new item${total === 1 ? '' : 's'}${bad ? ' · ' + bad + ' feed' + (bad > 1 ? 's' : '') + ' failing' : ''}`;
    say($('#status').textContent);
    render();
  }

  /* ---------- views ---------- */
  function digestSet() {
    const m = fmap(),
      since =
        prevVisit && Date.now() - prevVisit > 36e5
          ? prevVisit
          : Date.now() - 2 * DAY;
    const groups = cats()
      .map((c) => ({
        c,
        all: S.items
          .filter((i) => catOf(i, m) === c && i.date > since && !i.read)
          .sort((a, b) => b.date - a.date),
      }))
      .filter((g) => g.all.length);
    groups.forEach((g) => (g.show = g.all.slice(0, 3)));
    return { groups, flat: groups.flatMap((g) => g.show), since };
  }

  function visible() {
    if (st.view === 'digest') return digestSet().flat;
    const m = fmap(),
      q = st.q.toLowerCase();
    return S.items
      .filter(
        (i) =>
          (st.view === 'all' ||
            (st.view === 'saved'
              ? i.saved
              : st.view[0] === 'f'
                ? i.fid === st.view.slice(2)
                : catOf(i, m) === st.view.slice(2))) &&
          (!q ||
            (i.title + i.sum + (m.get(i.fid) || {}).title)
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        S.prefs.sort === 'old' ? a.date - b.date : b.date - a.date,
      );
  }
  const unread = (f) => {
    const m = fmap();
    return S.items.filter((i) => !i.read && f(i, m)).length;
  };

  function renderNav() {
    const cs = cats();
    CC = new Map(cs.map((c, i) => [c, CAT[i % CAT.length]]));
    const row = (key, label, n) =>
      `<li><button class="nav-btn" data-view="${key}" ${st.view === key ? 'aria-current="page"' : ''}><span class="lbl">${label}</span><span class="count">${n > 99 ? '99+' : n}</span></button></li>`;
    $('#nav-top').innerHTML =
      row(
        'all',
        'All items',
        unread(() => 1),
      ) + row('saved', 'Saved', S.items.filter((i) => i.saved).length);
    $('#nav-cats').innerHTML = cs
      .map((c) => {
        const open = st.exp.has(c),
          n = unread((i, m) => catOf(i, m) === c);
        let h = `<li><button class="nav-btn" data-view="c:${esc(c)}" aria-expanded="${open}" ${st.view === 'c:' + c ? 'aria-current="page"' : ''}><span class="lbl"><i class="cdot" style="background:${CC.get(c)}"></i>${esc(c)}</span><span class="count">${n > 99 ? '99+' : n}</span></button></li>`;
        if (open)
          h += S.feeds
            .filter((f) => f.cat === c)
            .map(
              (f) =>
                `<li><button class="nav-btn sub" data-view="f:${f.id}" ${st.view === 'f:' + f.id ? 'aria-current="page"' : ''}><span class="lbl"><i class="fav" style="background:${color(f.id)}" aria-hidden="true">${esc(f.title[0] || '?')}</i>${esc(f.title)}</span><span class="count">${unread((i) => i.fid === f.id)}</span></button></li>`,
            )
            .join('');
        return h;
      })
      .join('');
    const bad = S.feeds.filter((f) => f.status === 'error').length;
    $('#health').innerHTML = bad
      ? `<span class="st-error" aria-hidden="true">✕</span> ${bad} feed${bad > 1 ? 's' : ''} failing`
      : '<span class="st-active" aria-hidden="true">✓</span> All feeds healthy';
    const tv = ['digest', 'manage', 'discover'].includes(st.view)
      ? st.view
      : 'all';
    document
      .querySelectorAll('#top .tabs button')
      .forEach((b) => b.toggleAttribute('aria-current', b.dataset.view === tv));
  }

  function itemHTML(i, n, m) {
    const f = m.get(i.fid) || { title: '', cat: '' };
    return `<li class="item ${i.read ? 'read' : ''}" data-id="${i.id}" role="button" tabindex="0" aria-selected="${n === st.sel}"><span class="dot" aria-hidden="true"></span><div>
  <h3>${i.read ? '' : '<span class="sr">Unread: </span>'}${esc(i.title)}</h3>
  <div class="meta"><span class="fav" style="background:${color(i.fid)}" aria-hidden="true">${esc(f.title[0] || '?')}</span><span>${esc(f.title)}</span><time title="${new Date(i.date).toLocaleString()}">${ago(i.date)}</time>${i.saved ? '<span class="saved">Saved</span>' : ''}</div>
  <p class="sum">${esc(i.sum)}</p>${f.cat ? `<span class="chip" style="--c:${CC.get(f.cat) || '#64748b'}">${esc(f.cat)}</span>` : ''}</div></li>`;
  }

  function render() {
    renderNav();
    const mg = st.view === 'manage' || st.view === 'discover';
    $('#feed').classList.toggle('manage', mg);
    $('#list').hidden = mg;
    $('#manage').hidden = !mg;
    $('#title').textContent =
      {
        digest: 'Digest',
        all: 'All items',
        saved: 'Saved',
        manage: 'Manage feeds',
        discover: 'Discover',
      }[st.view] ||
      (st.view[0] === 'f'
        ? (fmap().get(st.view.slice(2)) || {}).title
        : st.view.slice(2));
    $('#unread').textContent = mg
      ? ''
      : visible().filter((i) => !i.read).length + ' unread';
    $('#sort').textContent = S.prefs.sort === 'old' ? 'Oldest' : 'Newest';
    $('#theme').textContent =
      S.prefs.theme[0].toUpperCase() + S.prefs.theme.slice(1);
    $('#theme').setAttribute(
      'aria-label',
      'Theme: ' + S.prefs.theme + '. Change theme',
    );
    document.documentElement.dataset.theme =
      S.prefs.theme === 'system' ? '' : S.prefs.theme;
    if (!document.documentElement.dataset.theme)
      document.documentElement.removeAttribute('data-theme');
    if (mg) return st.view === 'manage' ? renderManage() : renderDiscover();
    const m = fmap(),
      L = $('#list');
    L.className = 'list ' + (st.view === 'digest' ? 'list' : S.prefs.layout);
    let html;
    if (st.view === 'digest') {
      const d = digestSet();
      let n = 0;
      html = d.groups.length
        ? `<li class="empty" style="padding-bottom:0">${d.since === prevVisit ? 'Unread since your last visit' : 'Unread from the last 48 hours'}, top three per category.</li>` +
          d.groups
            .map(
              (g) =>
                `<li class="grp"><span>${esc(g.c)}</span>${g.all.length > 3 ? `<button class="btn small" data-view="c:${esc(g.c)}">${g.all.length - 3} more</button>` : ''}</li>` +
                g.show.map((i) => itemHTML(i, n++, m)).join(''),
            )
            .join('')
        : '<li class="empty">You are all caught up. Open All items to browse everything.</li>';
    } else {
      const l = visible();
      html = l.length
        ? (() => {
            let last = '';
            return l
              .map((i, n) => {
                const d = day(i.date),
                  h = d !== last ? `<li class="day">${d}</li>` : '';
                last = d;
                return h + itemHTML(i, n, m);
              })
              .join('');
          })()
        : `<li class="empty">${st.q ? 'No results. Check the spelling or try a different term.' : st.view === 'saved' ? 'Nothing saved yet. Press s on any item to keep it here.' : 'No items here yet. Find feeds to follow in Discover.'}</li>`;
    }
    L.innerHTML = html;
    L.querySelectorAll('[data-view]').forEach(
      (b) => (b.onclick = () => go(b.dataset.view)),
    );
  }
  const go = (v) => {
    st.view = v;
    st.sel = -1;
    $('#nav').classList.remove('open');
    render();
  };

  /* ---------- reader ---------- */
  function openItem(it) {
    if (!it) return;
    it.read = true;
    st.open = it.id;
    save();
    const f = fmap().get(it.fid) || { title: '', cat: '' };
    $('#app').classList.add('split');
    const r = $('#reader');
    r.hidden = false;
    r.innerHTML = `<div class="inner"><button class="btn small" id="back">Back to list</button><h2 style="margin-top:var(--space-5)">${esc(it.title)}</h2>
  <div class="meta"><span>${esc(f.title)}</span><time>${new Date(it.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time><span>${esc(f.cat)}</span></div>
  ${clean(it.html) || '<p>This feed only provides a title. Open the original to read more.</p>'}
  <div class="r-actions"><button class="btn small" id="r-prev">Previous</button><button class="btn small" id="r-next">Next</button><button class="btn small" id="r-save">${it.saved ? 'Remove from saved' : 'Save'}</button>${it.link ? `<a class="btn small" href="${esc(it.link)}" target="_blank" rel="noopener">Open original</a>` : ''}</div></div>`;
    r.scrollTop = 0;
    render();
    say('Opened ' + it.title);
  }

  const cur = () => visible()[st.sel];
  function step(d) {
    const l = visible();
    if (!l.length) return;
    st.sel = Math.max(0, Math.min(l.length - 1, st.sel + d));
    render();
    const el = $(`#list .item[data-id="${l[st.sel].id}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
      el.focus({ preventScroll: true });
    }
    if (st.open) openItem(l[st.sel]);
  }

  function toggle(it, k) {
    if (!it) return;
    it[k] = !it[k];
    save();
    render();
    say(
      k === 'saved'
        ? it.saved
          ? 'Saved'
          : 'Removed from saved'
        : it.read
          ? 'Marked as read'
          : 'Marked as unread',
    );
  }

  /* ---------- manage ---------- */
  const catOpts = (sel) =>
    cats()
      .concat(S.feeds.some((f) => f.cat === UNC) ? [] : [UNC])
      .map((c) => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`)
      .join('');
  const stIcon = { active: '✓ Healthy', stale: '! Stale', error: '✕ Error' };
  function renderManage() {
    const h = { active: 0, stale: 0, error: 0 };
    S.feeds.forEach((f) => h[f.status]++);
    $('#manage').innerHTML = `
  <section><h2>Add a feed</h2><form id="addf" class="row"><label>Feed URL<input name="u" type="url" required placeholder="https://example.com/feed.xml"></label><label>Category<select name="c">${catOpts()}</select></label><button class="btn primary">Add feed</button></form><p class="msg" id="addmsg" role="status"></p></section>
  <section><h2>Import and export</h2><div class="row"><label class="btn" for="opml">Import OPML</label><input id="opml" type="file" accept=".opml,.xml" hidden><button class="btn" id="exp">Export OPML</button></div><p class="msg" id="impmsg" role="status"></p></section>
  <section><h2>Refresh</h2><div class="row"><label>Auto-refresh<select id="interval">${[
    [15, 'Every 15 minutes'],
    [30, 'Every 30 minutes'],
    [60, 'Every hour'],
    [0, 'Manual only'],
  ]
    .map(
      ([v, t]) =>
        `<option value="${v}" ${S.prefs.interval === v ? 'selected' : ''}>${t}</option>`,
    )
    .join('')}</select></label></div>
  <p class="msg"><span class="st-active">✓ ${h.active} healthy</span> · <span class="st-stale">! ${h.stale} stale</span> · <span class="st-error">✕ ${h.error} failing</span></p></section>
  <section><h2>Categories</h2><form id="addc" class="row"><label>New category<input name="c" required></label><button class="btn">Add category</button></form><ul>${S.cats.map((c, i) => `<li class="frow"><b>${esc(c)}</b><span class="acts" style="grid-column:auto"><button class="btn small" data-act="up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="Move ${esc(c)} up">Up</button><button class="btn small" data-act="down" data-i="${i}" ${i < S.cats.length - 1 ? '' : 'disabled'} aria-label="Move ${esc(c)} down">Down</button><button class="btn small" data-act="rencat" data-i="${i}">Rename</button><button class="btn small" data-act="delcat" data-i="${i}">Delete</button></span></li>`).join('')}</ul></section>
  <section><h2>Feeds (${S.feeds.length})</h2><ul>${S.feeds
    .map(
      (
        f,
      ) => `<li class="frow"><div><b>${esc(f.title)}</b> <span class="st-${f.status}" aria-label="Feed status: ${f.status}">${stIcon[f.status]}</span><br><small>${esc(f.url)}</small><br><small>${f.fetched ? 'Last fetched ' + ago(f.fetched) : 'Not fetched yet'}${f.error ? ' · ' + esc(f.error) : ''}</small></div>
  <select data-act="cat" data-id="${f.id}" aria-label="Category for ${esc(f.title)}">${catOpts(f.cat)}</select><span class="acts"><button class="btn small" data-act="retry" data-id="${f.id}">Retry</button><button class="btn small" data-act="ren" data-id="${f.id}">Rename</button><button class="btn small" data-act="rm" data-id="${f.id}">Remove</button></span></li>`,
    )
    .join('')}</ul></section>`;
  }
  async function addFeed(url, cat) {
    const msg = $('#addmsg');
    if (S.feeds.some((f) => norm(f.url) === norm(url))) {
      msg.textContent = 'You already follow this feed.';
      return;
    }
    msg.textContent = 'Checking feed…';
    const f = {
      id: uid(),
      title: new URL(url).hostname,
      untitled: true,
      url,
      cat,
      status: 'active',
      fetched: 0,
      fails: 0,
    };
    S.feeds.push(f);
    const n = await fetchFeed(f, true);
    if (f.status === 'error') {
      S.feeds.pop();
      msg.textContent = f.error;
      return;
    }
    save();
    render();
    $('#addmsg').textContent = `Added ${f.title} with ${n} items.`;
    say('Feed added');
  }

  async function importOpml(file) {
    const doc = new DOMParser().parseFromString(await file.text(), 'text/xml'),
      out = $('#impmsg');
    if (doc.querySelector('parsererror')) {
      out.textContent = 'This file is not valid OPML.';
      return;
    }
    const attr = (e, n) => {
      const a = [...e.attributes].find((a) => a.name.toLowerCase() === n);
      return a ? a.value.trim() : '';
    };
    const seen = new Set(S.feeds.map((f) => norm(f.url)));
    let add = 0,
      dup = 0,
      bad = 0;
    const walk = (el, cat) =>
      [...el.children].forEach((o) => {
        if (o.localName !== 'outline') return;
        const url = attr(o, 'xmlurl'),
          text = attr(o, 'title') || attr(o, 'text');
        if (!url && attr(o, 'type') !== 'rss') return walk(o, text || cat);
        if (!/^https?:\/\//i.test(url)) {
          bad++;
          return;
        }
        if (seen.has(norm(url))) {
          dup++;
          return;
        }
        seen.add(norm(url));
        S.feeds.push({
          id: uid(),
          title: text || new URL(url).hostname,
          untitled: !text,
          url,
          cat,
          status: 'active',
          fetched: 0,
          fails: 0,
        });
        add++;
        if (cat !== UNC && !S.cats.includes(cat)) S.cats.push(cat);
      });
    walk(doc.querySelector('body') || doc.documentElement, UNC);
    save();
    render();
    $('#impmsg').textContent =
      `${add} feeds added, ${dup} duplicates skipped, ${bad} invalid. Refreshing to check for dead feeds.`;
    refreshAll(true);
  }

  function exportOpml() {
    const x = `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Frontpage</title></head><body>${cats()
      .map(
        (c) =>
          `<outline text="${esc(c)}">${S.feeds
            .filter((f) => f.cat === c)
            .map(
              (f) =>
                `<outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}"/>`,
            )
            .join('')}</outline>`,
      )
      .join('')}</body></opml>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([x], { type: 'text/x-opml' }));
    a.download = 'frontpage.opml';
    a.click();
  }

  const mg = $('#manage');
  mg.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    if (e.target.id === 'addf') addFeed(d.get('u'), d.get('c'));
    if (e.target.id === 'addc') {
      const c = d.get('c').trim();
      if (c && !S.cats.includes(c) && c !== UNC) {
        S.cats.push(c);
        save();
        render();
      }
    }
  });

  mg.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'opml' && t.files[0]) importOpml(t.files[0]);
    if (t.id === 'interval') {
      S.prefs.interval = +t.value;
      save();
    }
    if (t.dataset.act === 'cat') {
      S.feeds.find((f) => f.id === t.dataset.id).cat = t.value;
      save();
      render();
    }
  });

  mg.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.act,
      f = S.feeds.find((f) => f.id === b.dataset.id),
      i = +b.dataset.i;
    if (b.id === 'exp') return exportOpml();
    if (a === 'follow' || a === 'packall') {
      const cat = b.dataset.cat,
        have = new Set(S.feeds.map((x) => norm(x.url)));
      return follow(
        a === 'follow'
          ? CATALOG[cat].filter(([, u]) => u === b.dataset.url)
          : CATALOG[cat].filter(([, u]) => !have.has(norm(u))),
        cat,
      );
    }
    if (a === 'retry') {
      b.textContent = 'Retrying…';
      await fetchFeed(f, true);
      save();
      render();
    }
    if (a === 'ren') {
      const t = prompt('Feed title', f.title);
      if (t && t.trim()) {
        f.title = t.trim();
        f.untitled = false;
        save();
        render();
      }
    }
    if (
      a === 'rm' &&
      confirm(
        `Remove ${f.title}? Its items and saved articles will be deleted.`,
      )
    ) {
      S.feeds = S.feeds.filter((x) => x !== f);
      S.items = S.items.filter((x) => x.fid !== f.id);
      save();
      render();
    }
    if (a === 'up' || a === 'down') {
      const j = a === 'up' ? i - 1 : i + 1;
      [S.cats[i], S.cats[j]] = [S.cats[j], S.cats[i]];
      save();
      render();
    }
    if (a === 'rencat') {
      const o = S.cats[i],
        t = prompt('Category name', o);
      if (t && t.trim() && !S.cats.includes(t.trim())) {
        S.cats[i] = t.trim();
        S.feeds.forEach((x) => {
          if (x.cat === o) x.cat = t.trim();
        });
        save();
        render();
      }
    }
    if (
      a === 'delcat' &&
      confirm(`Delete ${S.cats[i]}? Its feeds move to Uncategorized.`)
    ) {
      const o = S.cats[i];
      S.cats.splice(i, 1);
      S.feeds.forEach((x) => {
        if (x.cat === o) x.cat = UNC;
      });
      save();
      render();
    }
  });

  /* ---------- discover ---------- */
  function renderDiscover() {
    const q = st.q.toLowerCase(),
      have = new Set(S.feeds.map((f) => norm(f.url)));
    const secs = Object.entries(CATALOG)
      .map(([cat, list]) => {
        const L = list.filter(
          ([t, u]) => !q || (t + cat + u).toLowerCase().includes(q),
        );
        if (!L.length) return '';
        const todo = L.filter(([, u]) => !have.has(norm(u))).length;
        return `<section><div class="row" style="justify-content:space-between;align-items:center"><h2>${esc(cat)}</h2>${todo ? `<button class="btn small" data-act="packall" data-cat="${esc(cat)}">Follow all (${todo})</button>` : '<span class="muted">Following all</span>'}</div><ul>${L.map(([t, u]) => `<li class="frow"><div><b>${esc(t)}</b><br><small>${esc(new URL(u).hostname)}</small></div>${have.has(norm(u)) ? '<span class="muted">Following</span>' : `<button class="btn small" data-act="follow" data-url="${esc(u)}" data-cat="${esc(cat)}" aria-label="Follow ${esc(t)}">Follow</button>`}</li>`).join('')}</ul></section>`;
      })
      .join('');
    $('#manage').innerHTML =
      `<section><h2>Find feeds to follow</h2><p class="msg">Follow a whole starter pack or pick feeds one at a time. The search box filters this list. To add any other feed by URL, use Manage.</p><p class="msg" id="dmsg" role="status"></p></section>` +
      (secs ||
        '<section><p class="msg">No feeds match your search. Check the spelling, or add the feed by URL in Manage.</p></section>');
  }
  async function follow(list, cat) {
    if (!list.length) return;
    if (!S.cats.includes(cat)) S.cats.push(cat);
    const q = [...list];
    let bad = 0;
    await Promise.all(
      [0, 1, 2, 3].map(async () => {
        while (q.length) {
          const [t, u] = q.shift();
          $('#dmsg').textContent = `Adding ${t}…`;
          const f = {
            id: uid(),
            title: t,
            url: u,
            cat,
            status: 'active',
            fetched: 0,
            fails: 0,
          };
          S.feeds.push(f);
          await fetchFeed(f, true);
          if (f.status === 'error') bad++;
        }
      }),
    );
    save();
    renderNav();
    renderDiscover();
    $('#dmsg').textContent =
      `Followed ${list.length} feed${list.length > 1 ? 's' : ''}${bad ? `. ${bad} could not load yet. Retry them in Manage.` : '.'}`;
    say($('#dmsg').textContent);
  }

  /* ---------- wiring ---------- */
  $('#open').onclick = () => {
    $('#landing').hidden = true;
    $('#app').hidden = false;
    $$('[data-layout]').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.layout === S.prefs.layout),
    );

    render();
    $('#list').focus();
    if (Date.now() - S.lastAll > 5 * 60000) refreshAll(false);
  };

  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    const v = b.dataset.view;
    if (v.startsWith('c:')) {
      const c = v.slice(2);
      if (st.view === v && st.exp.has(c)) st.exp.delete(c);
      else st.exp.add(c);
    }
    go(v);
  });

  $('#top').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) go(b.dataset.view);
  });

  $('#health').onclick = () => go('manage');
  $('#add').onclick = () => {
    go('manage');
    setTimeout(() => {
      const i = $('#addf input');
      if (i) i.focus();
    }, 0);
  };

  $('#sort').onclick = () => {
    S.prefs.sort = S.prefs.sort === 'old' ? 'new' : 'old';
    save();
    render();
  };

  $('#banner').onclick = () => {
    $('#banner').hidden = true;
    window.scrollTo({ top: 0 });
  };

  $('#list').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (!li) return;
    const l = visible();
    st.sel = l.findIndex((i) => i.id === li.dataset.id);
    openItem(l[st.sel]);
  });

  $('#list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.item')) e.target.click();
  });

  $('#q').oninput = (e) => {
    st.q = e.target.value;
    st.sel = -1;
    if (st.view === 'discover') return renderDiscover();
    if (['digest', 'manage'].includes(st.view)) st.view = 'all';
    render();
    say(visible().length + ' results');
  };

  $$('[data-layout]').forEach(
    (b) =>
      (b.onclick = () => {
        S.prefs.layout = b.dataset.layout;
        $$('[data-layout]').forEach((x) =>
          x.setAttribute('aria-pressed', x === b),
        );
        save();
        render();
      }),
  );

  $('#markall').onclick = () => {
    visible().forEach((i) => (i.read = true));
    save();
    render();
    say('All items marked as read');
  };

  $('#refresh').onclick = () => refreshAll(true);
  $('#theme').onclick = () => {
    const o = ['system', 'light', 'dark'];
    S.prefs.theme = o[(o.indexOf(S.prefs.theme) + 1) % 3];
    save();
    render();
  };

  $('#menu').onclick = () => $('#nav').classList.toggle('open');
  $('#reader').addEventListener('click', (e) => {
    const id = e.target.id;
    if (id === 'back') {
      st.open = null;
      $('#reader').hidden = true;
      $('#app').classList.remove('split');
      render();
    }
    if (id === 'r-prev') step(-1);
    if (id === 'r-next') step(1);
    if (id === 'r-save') {
      const it = S.items.find((i) => i.id === st.open);
      toggle(it, 'saved');
      openItem(it);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ($('#app').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.matches('input,select,textarea')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    const k = e.key;
    if (st.g) {
      st.g = false;
      const v = { h: 'digest', a: 'all', s: 'saved', f: 'manage' }[k];
      if (v) go(v);
      return;
    }
    if (k === 'j') step(1);
    else if (k === 'k') step(-1);
    else if (k === 'o' || k === 'Enter') openItem(cur());
    else if (k === 'm') toggle(cur(), 'read');
    else if (k === 's') toggle(cur(), 'saved');
    else if (k === 'g') st.g = true;
    else if (k === '/') {
      e.preventDefault();
      $('#q').focus();
    }
  });

  setInterval(() => {
    if (
      !$('#app').hidden &&
      S.prefs.interval &&
      Date.now() - S.lastAll > S.prefs.interval * 60000
    )
      refreshAll(false);
  }, 60000);
  save();
})();

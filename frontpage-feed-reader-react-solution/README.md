# Frontpage (Vite + React)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
```

- `src/App.jsx` shell, state wiring, actions, keyboard shortcuts
- `src/Views.jsx` item list, digest, reader, Discover, Manage
- `src/store.js` state hook, saved to localStorage (`frontpage.v2`)
- `src/lib/feeds.js` feed fetch, parse, sanitize, merge
- `src/lib/opml.js` OPML import and export
- `src/lib/data.js` sample feeds and the Discover catalog

Feeds are fetched through a public CORS proxy (`PROXY` in `src/lib/feeds.js`). Replace it with your own server-side function before deploying.

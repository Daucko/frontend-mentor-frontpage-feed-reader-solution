export const SEED = {
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

  export const TOPICS = {
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

  export const CATALOG = JSON.parse(JSON.stringify(SEED));
  CATALOG.Frontend.push(['Overreacted', 'https://overreacted.io/rss.xml']);
  CATALOG['General Tech'].push(
    ['Julia Evans', 'https://jvns.ca/atom.xml'],
    ['Daring Fireball', 'https://daringfireball.net/feeds/main'],
  );

  export const BODY = [
    'Sample content shown until this feed loads. Real items replace it after the first successful refresh.',
    'Reader view uses a serif face at a narrow measure. Inline <code>code</code> uses the monospace stack from the brand kit.',
    'Use j and k to move, o to open, m to toggle read, and s to save.',
  ];
  export const COLORS = [
    '#2563eb',
    '#16a34a',
    '#ca8a04',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
  ];
  export const CAT = ['#2563eb', '#ec4899', '#f59e0b', '#6366f1', '#8b5cf6', '#14b8a6', '#ef4444'];

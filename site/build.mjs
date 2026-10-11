// Static site builder. Reads content/*.md (front matter + markdown), writes dist/.
import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const ORIGIN = 'https://bodencrouch.github.io';
const BASE = '/strongroom/';
const REPO = 'https://github.com/bodencrouch/strongroom';
const SITE_NAME = 'Strongroom';
const OG_IMAGE = `${ORIGIN}${BASE}og.png`;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const strip = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function frontMatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
  if (!m) throw new Error('missing front matter');
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2');
  }
  return { meta, body: m[2] };
}

const slugify = (t) =>
  strip(t)
    .split(':')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(inner)}">${inner}</h${depth}>\n`;
    },
  },
});

// Internal links in markdown are written as /path/ and get the base path here.
const withBase = (path) => (path === '/' ? BASE : BASE + path.replace(/^\//, ''));
const rewriteLinks = (html) =>
  html.replace(/(href|src)="(\/[^"/][^"]*|\/)"/g, (_, attr, p) => `${attr}="${withBase(p)}"`);

// Wrap tables so they scroll on narrow screens; add rel to external links.
function post(html) {
  return rewriteLinks(html)
    .replace(
      /<table>/g,
      '<div class="tablewrap" tabindex="0" role="region" aria-label="Table"><table>',
    )
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" rel="noopener"');
}

const files = (await readdir(join(here, 'content'))).filter((f) => f.endsWith('.md')).sort();
const pages = [];
for (const f of files) {
  const { meta, body } = frontMatter(await readFile(join(here, 'content', f), 'utf8'));
  const slug = f.replace(/\.md$/, '');
  pages.push({ ...meta, slug, body });
}
const byOrder = pages.filter((p) => p.nav).sort((a, b) => Number(a.order) - Number(b.order));

const urlOf = (p) =>
  p.slug === 'home' ? BASE : p.slug === '404' ? `${BASE}404.html` : `${BASE}${p.slug}/`;

function jsonLd(p, html) {
  const url = ORIGIN + urlOf(p);
  const blocks = [];
  if (p.slug === 'home') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: ORIGIN + BASE,
      description: p.description,
      inLanguage: 'en',
    });
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      description:
        'Unofficial Bitwarden client: desktop app, browser extension, Raycast extension and command line.',
      applicationCategory: 'SecurityApplication',
      operatingSystem:
        'macOS, Linux, Windows (build from source); Chromium and Firefox browsers; Raycast',
      url: ORIGIN + BASE,
      codeRepository: REPO,
      license: 'https://opensource.org/licenses/MIT',
      isBasedOn: 'https://github.com/dillionverma/bitlatch',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'Boden Crouch' },
    });
  } else if (p.slug !== '404') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: ORIGIN + BASE },
        { '@type': 'ListItem', position: 2, name: p.nav, item: url },
      ],
    });
  }
  if (p.slug === 'faq') {
    const parts = html.split(/<h2[^>]*>/).slice(1);
    const mainEntity = parts.map((chunk) => {
      const [q, ...rest] = chunk.split('</h2>');
      return {
        '@type': 'Question',
        name: strip(q),
        acceptedAnswer: { '@type': 'Answer', text: strip(rest.join('')) },
      };
    });
    blocks.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity });
  }
  return blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`,
    )
    .join('\n');
}

const css = await readFile(join(here, 'style.css'), 'utf8');

function render(p) {
  const raw = marked.parse(p.body, { gfm: true });
  const html = post(raw);
  const url = ORIGIN + urlOf(p);
  const crumbs =
    p.slug === 'home' || p.slug === '404'
      ? ''
      : `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${BASE}">Strongroom</a></li><li><span aria-current="page">${esc(p.nav)}</span></li></ol></nav>`;
  const nav = byOrder
    .map(
      (n) =>
        `<li><a href="${urlOf(n)}"${n.slug === p.slug ? ' aria-current="page"' : ''}>${esc(n.nav)}</a></li>`,
    )
    .join('');
  const robots = p.slug === '404' ? '<meta name="robots" content="noindex">\n' : '';
  const canonical = p.slug === '404' ? '' : `<link rel="canonical" href="${url}">\n`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
${robots}${canonical}<meta name="theme-color" content="#0f766e" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1211" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/svg+xml" href="${BASE}icon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="${BASE}favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="${BASE}favicon-16.png">
<link rel="apple-touch-icon" href="${BASE}apple-touch-icon.png">
<link rel="manifest" href="${BASE}manifest.webmanifest">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${p.slug === 'home' ? 'website' : 'article'}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Strongroom: an unofficial Bitwarden client">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="twitter:image:alt" content="Strongroom: an unofficial Bitwarden client">
<style>${css}</style>
${jsonLd(p, html)}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap">
<a class="brand" href="${BASE}"><img src="${BASE}favicon-32.png" width="28" height="28" alt="">Strongroom</a>
<nav aria-label="Main"><ul>${nav}</ul></nav>
</div></header>
<main id="main"><div class="wrap">
${crumbs}
${html}
</div></main>
<footer class="site"><div class="wrap">
<p>Strongroom is an independent project. It is not affiliated with, endorsed by or sponsored by Bitwarden. Bitwarden is a trademark of Bitwarden, Inc.</p>
<p>MIT licensed. <a href="${REPO}">Source on GitHub</a>, <a href="${REPO}/issues">issue tracker</a>.</p>
</div></footer>
</body>
</html>
`;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(here, 'static'), dist, { recursive: true });

for (const p of pages) {
  const out =
    p.slug === 'home'
      ? join(dist, 'index.html')
      : p.slug === '404'
        ? join(dist, '404.html')
        : join(dist, p.slug, 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, render(p));
}

const indexed = pages.filter((p) => p.slug !== '404');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed
  .map((p) => `  <url><loc>${ORIGIN}${urlOf(p)}</loc><lastmod>${p.updated}</lastmod></url>`)
  .join('\n')}
</urlset>
`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`,
);
console.log(`built ${pages.length} pages`);

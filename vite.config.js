import { defineConfig } from 'vite';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { META, SITE_URL, OG_IMAGE_URL } from './src/config.js';

// Injects the share-preview values from src/config.js into index.html at
// dev and build time, so WhatsApp's crawler sees them without running JS.
const injectMeta = () => ({
  name: 'inject-meta',
  transformIndexHtml(html) {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return html
      .replaceAll('%TITLE%', esc(META.title))
      .replaceAll('%DESCRIPTION%', esc(META.description))
      .replaceAll('%THEME_COLOR%', esc(META.themeColor))
      .replaceAll('%SITE_URL%', esc(SITE_URL))
      .replaceAll('%OG_IMAGE%', esc(OG_IMAGE_URL));
  },
});

// Every /images/… URL gets ?v=<content hash>, so when a painting changes its
// address changes too and no phone can keep showing an old copy.
const IMG_RE = /\/images\/([A-Za-z0-9_.-]+\.(?:webp|jpg|png))(?!\?v=)/g;
const hashes = new Map();
const version = (file) => {
  if (!hashes.has(file)) {
    try {
      hashes.set(file, crypto.createHash('sha1').update(fs.readFileSync(`public/images/${file}`)).digest('hex').slice(0, 8));
    } catch {
      hashes.set(file, null);
    }
  }
  return hashes.get(file);
};
const addVersions = (code) => code.replace(IMG_RE, (m, file) => (version(file) ? `${m}?v=${version(file)}` : m));

// Applied to the finished files (Vite rewrites srcset and CSS url() late).
const versionImages = () => ({
  name: 'version-images',
  apply: 'build',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const f of Object.values(bundle)) {
      if (f.type === 'chunk') f.code = addVersions(f.code);
      else if (/\.(html|css)$/.test(f.fileName)) f.source = addVersions(String(f.source));
    }
  },
});

export default defineConfig({
  plugins: [injectMeta(), versionImages()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
  },
  server: { host: true },
});

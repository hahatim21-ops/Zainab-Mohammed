import { defineConfig } from 'vite';
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

export default defineConfig({
  plugins: [injectMeta()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
  },
  server: { host: true },
});

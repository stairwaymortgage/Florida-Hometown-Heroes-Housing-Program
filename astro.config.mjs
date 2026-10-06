import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://floridahometownheroeshousingprogram2026.com',
  trailingSlash: 'never',
  // Emit /contact-us.html (not /contact-us/index.html) so Vercel cleanUrls
  // serves the exact same URLs the plain-HTML site had.
  build: { format: 'file' },
  integrations: [sitemap()],
});

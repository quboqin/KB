import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// Note: @astrojs/sitemap is installed but omitted here due to a known
// version-compatibility issue with astro 4.15. Re-add after upgrading.
export default defineConfig({
  site: 'https://kb.example.com',
  integrations: [
    mdx({
      syntaxHighlight: false,
    }),
    tailwind({ applyBaseStyles: false }),
  ],
  markdown: {
    syntaxHighlight: false,
  },
});

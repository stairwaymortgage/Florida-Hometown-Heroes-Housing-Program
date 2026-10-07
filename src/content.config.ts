// Blog content collection.
//
// The frontmatter here matches exactly what the n8n "Blog Auto-Post" workflow
// writes in its "Build Post File" node, so posts it commits to
// src/content/blog/*.md validate and render with no manual step:
//   title, description, pubDate, cats, tags, heroImage, heroAlt,
//   author, nmls, county, draft, faq.
// If you change a field name here, change it in that node too.
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    cats: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    author: z.string().default('Jim Blackburn'),
    nmls: z.string().optional(),
    county: z.string().optional(),
    draft: z.boolean().default(false),
    // Rendered as FAQPage JSON-LD on the post page.
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { blog };

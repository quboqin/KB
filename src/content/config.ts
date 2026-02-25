import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['技术', '金融', 'AI', '生活', '其他']).default('其他'),
    draft: z.boolean().default(false),
    readingTime: z.number().optional(),
  }),
});

export const collections = { posts };

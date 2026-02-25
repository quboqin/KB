import { getCollection, type CollectionEntry } from 'astro:content';

export async function getAllPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getRelatedPosts(
  current: CollectionEntry<'posts'>,
  limit = 3
): Promise<CollectionEntry<'posts'>[]> {
  const all = await getAllPosts();
  const currentTags = new Set(current.data.tags);

  return all
    .filter(p => p.slug !== current.slug)
    .map(p => ({
      post: p,
      score: p.data.tags.filter(t => currentTags.has(t)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}

export async function getAllCategories(): Promise<{ name: string; count: number }[]> {
  const posts = await getAllPosts();
  const catMap = new Map<string, number>();

  for (const post of posts) {
    const cat = post.data.category;
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  return Array.from(catMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAllTags(): Promise<{ name: string; count: number }[]> {
  const posts = await getAllPosts();
  const tagMap = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

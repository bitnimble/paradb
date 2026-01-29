import { ComponentType } from 'react';

export type BlogPostMetadata = {
  id: string;
  title: string;
  summary: string;
  date: Date;
};

export type BlogPostModule = {
  default: ComponentType;
  metadata: BlogPostMetadata;
};

// Import all MDX posts - add new posts here
const postModules = {
  welcome: () => import('content/blog/welcome.mdx'),
} as const;

export type PostId = keyof typeof postModules;

export async function getAllPosts(): Promise<BlogPostMetadata[]> {
  const posts = await Promise.all(
    Object.values(postModules).map(async (importFn) => {
      const mod = (await importFn()) as BlogPostModule;
      return mod.metadata;
    })
  );
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getPostById(id: string): Promise<BlogPostModule | undefined> {
  const importFn = postModules[id as PostId];
  if (importFn == null) {
    return undefined;
  }
  return (await importFn()) as BlogPostModule;
}

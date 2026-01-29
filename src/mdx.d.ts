declare module '*.mdx' {
  import { ComponentType } from 'react';
  import { BlogPostMetadata } from 'app/blog/posts';

  export const metadata: BlogPostMetadata;
  const MDXComponent: ComponentType;
  export default MDXComponent;
}

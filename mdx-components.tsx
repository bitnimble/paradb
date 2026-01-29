import type { MDXComponents } from 'mdx/types';
import styles from './src/ui/base/mdx/mdx.module.css';
import { T } from './src/ui/base/text/text';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => (
      <T.ExtraLarge weight="bold" display="block" className={styles.heading}>
        {children}
      </T.ExtraLarge>
    ),
    h2: ({ children }) => (
      <T.Large weight="bold" display="block" className={styles.heading}>
        {children}
      </T.Large>
    ),
    h3: ({ children }) => (
      <T.Medium weight="bold" display="block" className={styles.heading}>
        {children}
      </T.Medium>
    ),
    p: ({ children }) => (
      <T.Medium display="block" className={styles.paragraph}>
        {children}
      </T.Medium>
    ),
    ul: ({ children }) => <ul className={styles.list}>{children}</ul>,
    ol: ({ children }) => <ol className={styles.list}>{children}</ol>,
    li: ({ children }) => (
      <li>
        <T.Medium>{children}</T.Medium>
      </li>
    ),
    a: ({ href, children }) => (
      <a href={href} className={styles.link}>
        {children}
      </a>
    ),
    strong: ({ children }) => <T.Medium weight="bold">{children}</T.Medium>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <T.Medium style="code">{children}</T.Medium>,
    pre: ({ children }) => (
      <T.Medium style="code" display="block">
        {children}
      </T.Medium>
    ),
    blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
    hr: () => <hr className={styles.hr} />,
  };
}

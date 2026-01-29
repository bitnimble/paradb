import { notFound } from 'next/navigation';
import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { RoutePath, routeFor } from 'utils/routes';
import { getAllPosts, getPostById } from '../../posts';
import styles from './page.module.css';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ id: post.id }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);

  if (post == null) {
    notFound();
  }

  const { metadata, default: Content } = post;

  return (
    <div className={styles.post}>
      <div className={styles.backLink}>
        <RouteLink href={routeFor([RoutePath.BLOG])}>&larr; Back</RouteLink>
      </div>
      <div className={styles.header}>
        <div className={styles.title}>
          <T.ExtraLarge weight="bold">{metadata.title}</T.ExtraLarge>
        </div>
        <T.Small color="fgSecondary">
          {metadata.date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </T.Small>
      </div>
      <div className={styles.content}>
        <Content />
      </div>
    </div>
  );
}

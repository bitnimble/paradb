import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { RoutePath, routeFor } from 'utils/routes';
import styles from './page.module.css';
import { getAllPosts } from './posts';

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className={styles.blog}>
      <div className={styles.header}>
        <T.ExtraLarge weight="bold">Blog</T.ExtraLarge>
      </div>
      <div className={styles.postList}>
        {posts.map((post) => (
          <RouteLink
            key={post.id}
            href={routeFor([RoutePath.BLOG, RoutePath.POST, post.id])}
            additionalClassName={styles.postCard}
          >
            <div className={styles.postTitle}>
              <T.Large weight="semibold">{post.title}</T.Large>
            </div>
            <div className={styles.postDate}>
              <T.Small color="fgSecondary">
                {post.date.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </T.Small>
            </div>
            <div className={styles.postSummary}>
              <T.Medium color="fgSecondary">{post.summary}</T.Medium>
            </div>
          </RouteLink>
        ))}
      </div>
    </div>
  );
}

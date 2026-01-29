import Content from 'content/pages/instructions.mdx';
import styles from './page.module.css';

export default function Instructions() {
  return (
    <div className={styles.instructions}>
      <Content />
    </div>
  );
}

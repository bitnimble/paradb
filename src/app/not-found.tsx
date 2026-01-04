import { T } from 'ui/base/text/text';
import styles from './not-found.module.css';

export const NotFound = () => {
  return (
    <div className={styles.notfound}>
      <T.Medium>{"This page doesn't seem to exist."}</T.Medium>
    </div>
  );
};

export default NotFound;

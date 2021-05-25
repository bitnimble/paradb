import { T } from 'pages/paradb/base/text/text';
import React from 'react';
import styles from './nav_bar.css';

export type NavBarProps = {

}

export class NavBar extends React.Component<NavBarProps> {
  render() {
    return (
      <div className={styles.navbar}>
        <div className={styles.logo}>
          <T.Medium style="title">paraDB</T.Medium>
        </div>
      </div>
    )
  }
}

import React from 'react';
import styles from './nav_bar.css';

export type NavBarProps = {

}

export class NavBar extends React.Component<NavBarProps> {
  render() {
    return (
      <div className={styles.navbar}>
        Test nav bar
      </div>
    )
  }
}

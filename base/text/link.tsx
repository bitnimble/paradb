import * as H from 'history';
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import styles from './link.css';

export const RouteLink = <S extends H.LocationState>(props: LinkProps<S> & React.RefAttributes<HTMLAnchorElement>) => (
    <Link className={styles.link} {...props}></Link>
);

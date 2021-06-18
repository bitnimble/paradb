import classNames from 'classnames';
import * as H from 'history';
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import styles from './link.css';

type RouteLinkProps = {
  force?: boolean;
}

export const RouteLink = <S extends H.LocationState>(props: LinkProps<S> & React.RefAttributes<HTMLAnchorElement> & RouteLinkProps) =>
  props.force && typeof props.to === 'string'
  ? <a href={props.to} className={classNames(props.className, styles.link)}>{props.children}</a>
  : <Link className={classNames(props.className, styles.link)} {...props}></Link>

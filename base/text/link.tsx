import classNames from 'classnames';
import * as H from 'history';
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import styles from './link.css';

type RouteLinkProps = {
  additionalClassName?: string,
  force?: boolean,
};

export const RouteLink = <
    S extends H.LocationState,
>(props: LinkProps<S> & React.RefAttributes<HTMLAnchorElement> & RouteLinkProps) => {
  const className = classNames(props.additionalClassName, styles.link);
  return props.force && typeof props.to === 'string'
      ? <a href={props.to} className={className}>{props.children}</a>
      : <Link className={className} {...props}></Link>;
};

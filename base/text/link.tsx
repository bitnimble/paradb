import classNames from 'classnames';
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import styles from './link.css';

type RouteLinkProps = { additionalClassName?: string, force?: boolean };

export const RouteLink = (
  props: LinkProps & React.RefAttributes<HTMLAnchorElement> & RouteLinkProps,
) => {
  const className = classNames(props.additionalClassName, styles.link);
  const { additionalClassName, ...htmlProps } = props;
  return props.force && typeof props.to === 'string'
    ? <a href={props.to} className={className}>{props.children}</a>
    : <Link className={className} {...htmlProps}></Link>;
};

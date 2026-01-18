import classNames from 'classnames';
import Link, { LinkProps } from 'next/link';
import React from 'react';
import styles from './link.module.css';

type RouteLinkProps = { additionalClassName?: string; force?: boolean };

export const RouteLink = (
  props: React.PropsWithChildren<
    LinkProps & React.RefAttributes<HTMLAnchorElement> & RouteLinkProps
  >
) => {
  const className = classNames(props.additionalClassName, styles.link);
  const { additionalClassName, ...htmlProps } = props;
  return props.force && typeof props.href === 'string' ? (
    <a href={props.href} className={className}>
      {props.children}
    </a>
  ) : (
    <Link className={className} {...htmlProps}></Link>
  );
};

import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import { Masonry, MasonryStore } from './masonry';
import styles from './masonry.module.css';

export function createMasonry(columns?: number) {
  const node = document.createElement('style');
  document.head.appendChild(node);
  const stylesheet = node.sheet as CSSStyleSheet;

  const store = new MasonryStore(columns);

  reaction(
    () => store.columns,
    (columns) => {
      const lines = Array(columns - 1)
        .fill(0)
        .map(
          (_, i) => `.${styles.orderedItem}:nth-of-type(${columns}n+${i + 1}) { order: ${i + 1}; }`
        );

      // Delete all existing rules.
      for (let i = 0; i < stylesheet.cssRules.length; i++) {
        stylesheet.deleteRule(i);
      }

      for (const line of lines) {
        stylesheet.insertRule(line, 0);
      }
      stylesheet.insertRule(
        `.${styles.orderedItem}:nth-of-type(${columns}n) { order: ${columns}; }`,
        0
      );
      stylesheet.insertRule(`.${styles.masonryItem} { width: calc(100% / ${columns}); }`, 0);
    },
    { fireImmediately: true }
  );

  return {
    masonryStore: store,
    Masonry: observer(() => <Masonry store={store} />),
  };
}

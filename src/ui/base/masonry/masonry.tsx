import classNames from 'classnames';
import { autorun, computed, IObservableValue, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import styles from './masonry.module.css';

export type MasonryItem = {
  loaded: IObservableValue<boolean>;
  Component: React.ComponentType;
};

export class MasonryStore {
  @observable.deep
  items: MasonryItem[] = [];

  @observable.ref
  columns = 4;

  constructor(columns?: number) {
    if (columns) {
      this.columns = columns;
    }
  }
}

type Props = {
  store: MasonryStore;
};

@observer
export class Masonry extends React.Component<Props> {
  private containerRef = React.createRef<HTMLDivElement>();

  @observable
  private computedHeight: number = 0;

  constructor(props: Props) {
    super(props);
    autorun(() => {
      const loadedCount = this.props.store.items
        .map((item) => item.loaded.get() === true)
        .reduce((p, c) => p + Number(c), 0);
      if (loadedCount === this.props.store.items.length) {
        this.recalculateHeight();
      }
    });
  }

  private recalculateHeight() {
    const el = this.containerRef.current;
    if (!el) {
      return;
    }
    const heights = Array<number>(this.props.store.columns).fill(0);
    for (const child of el.children) {
      if (child.classList.contains(styles.masonryItem)) {
        const style = window.getComputedStyle(child);
        const order = parseInt(style.getPropertyValue('order'));
        const height = Math.ceil(parseFloat(style.getPropertyValue('height')));
        heights[order - 1] += height;
      }
    }

    const maxHeight = Math.max(...heights);
    if (this.computedHeight != maxHeight) {
      runInAction(() => (this.computedHeight = maxHeight));
    }
  }

  componentDidMount() {
    this.recalculateHeight();
  }

  componentDidUpdate() {
    this.recalculateHeight();
  }

  @computed
  private get items() {
    return this.props.store.items.map((item, i) => (
      <div
        key={`item-${i}`}
        className={classNames(styles.masonryItem, styles.orderedItem)}
        style={{ width: `calc(100% / ${this.props.store.columns})` }}
      >
        {<item.Component />}
      </div>
    ));
  }

  render() {
    const { columns } = this.props.store;

    return (
      <div
        className={styles.masonry}
        style={{ height: `${this.computedHeight}px` }}
        ref={this.containerRef}
      >
        {this.items}
        {Array(columns - 1)
          .fill(0)
          .map((_, i) => (
            <span key={i} className={classNames(styles.break, styles.orderedItem)}></span>
          ))}
      </div>
    );
  }
}

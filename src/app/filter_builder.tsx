'use client';

import { MapListStore } from 'app/map_list_presenter';
import {
  SimpleFilter,
  extractSimpleFilter,
  nodeToSimpleFilter,
  simpleFilterToNode,
} from 'app/filter_modes';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  CmpNode,
  FILTER_FIELDS,
  FilterNode,
  FilterOp,
  FilterableField,
  OPS_BY_KIND,
} from 'schema/map_filter';
import { Textbox } from 'ui/base/textbox/textbox';
import { T } from 'ui/base/text/text';
import styles from './filter_builder.module.css';

const OP_LABELS: Record<FilterOp, string> = {
  eq: 'equals',
  neq: 'not equals',
  contains: 'contains',
  startsWith: 'starts with',
  has: 'has tag',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  before: 'before',
  after: 'after',
};

const FIELD_LABELS: Record<FilterableField, string> = {
  title: 'Title',
  artist: 'Artist',
  author: 'Mapper',
  uploader: 'Uploader',
  description: 'Description',
  tags: 'Tags',
  complexity: 'Complexity',
  downloadCount: 'Downloads',
  submissionDate: 'Upload date',
};

const ALL_FIELDS = Object.keys(FILTER_FIELDS) as FilterableField[];

export const FilterBuilder = observer((props: { store: MapListStore }) => {
  const { store } = props;
  return (
    <div className={styles.builder}>
      {store.filterMode === 'simple' ? (
        <SimpleBuilder store={store} />
      ) : (
        <AdvancedBuilder store={store} />
      )}
      <ModeSwitch store={store} />
    </div>
  );
});

const SimpleBuilder = observer((props: { store: MapListStore }) => {
  const { store } = props;
  const set = action((patch: Partial<SimpleFilter>) => {
    store.simpleFilter = { ...store.simpleFilter, ...patch };
  });
  return (
    <div className={styles.simple}>
      <Textbox
        label="Artist"
        error={undefined}
        value={store.simpleFilter.artist ?? ''}
        onChange={(v) => set({ artist: v })}
      />
      <Textbox
        label="Mapper"
        error={undefined}
        value={store.simpleFilter.author ?? ''}
        onChange={(v) => set({ author: v })}
      />
      <Textbox
        label="Description"
        error={undefined}
        value={store.simpleFilter.description ?? ''}
        onChange={(v) => set({ description: v })}
      />
      <DateField
        label="Uploaded after"
        value={store.simpleFilter.after ?? ''}
        onChange={(v) => set({ after: v || undefined })}
      />
      <DateField
        label="Uploaded before"
        value={store.simpleFilter.before ?? ''}
        onChange={(v) => set({ before: v || undefined })}
      />
    </div>
  );
});

const DateField = (props: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className={styles.dateField}>
    <T.Small color="fgSecondary">{props.label}</T.Small>
    <input
      type="date"
      className={styles.dateInput}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  </label>
);

const AdvancedBuilder = observer((props: { store: MapListStore }) => {
  const { store } = props;
  // The root must be a group so conditions/groups can be added to it.
  const node = store.advancedFilter;
  const root: FilterNode =
    node && (node.type === 'and' || node.type === 'or')
      ? node
      : { type: 'and', children: node ? [node] : [] };
  const setRoot = action((n: FilterNode) => (store.advancedFilter = n));
  return <GroupEditor node={root} onChange={setRoot} />;
});

const defaultCmp = (): CmpNode => ({ type: 'cmp', field: 'title', op: 'contains', value: '' });

const GroupEditor = (props: {
  node: Extract<FilterNode, { type: 'and' | 'or' }>;
  onChange: (n: FilterNode) => void;
  onRemove?: () => void;
}) => {
  const { node, onChange, onRemove } = props;
  const updateChild = (i: number, child: FilterNode) =>
    onChange({ ...node, children: node.children.map((c, idx) => (idx === i ? child : c)) });
  const removeChild = (i: number) =>
    onChange({ ...node, children: node.children.filter((_, idx) => idx !== i) });
  const addChild = (child: FilterNode) =>
    onChange({ ...node, children: [...node.children, child] });
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <div className={styles.toggle}>
          <ToggleButton
            active={node.type === 'and'}
            onClick={() => onChange({ ...node, type: 'and' })}
          >
            AND
          </ToggleButton>
          <ToggleButton
            active={node.type === 'or'}
            onClick={() => onChange({ ...node, type: 'or' })}
          >
            OR
          </ToggleButton>
        </div>
        {onRemove && (
          <button
            type="button"
            className={styles.remove}
            aria-label="Remove group"
            onClick={onRemove}
          >
            ✕
          </button>
        )}
      </div>
      <div className={styles.children}>
        {node.children.map((child, i) => (
          <NodeEditor
            key={i}
            node={child}
            onChange={(c) => updateChild(i, c)}
            onRemove={() => removeChild(i)}
          />
        ))}
      </div>
      <div className={styles.addRow}>
        <button type="button" className={styles.add} onClick={() => addChild(defaultCmp())}>
          + Condition
        </button>
        <button
          type="button"
          className={styles.add}
          onClick={() => addChild({ type: 'and', children: [] })}
        >
          + Group
        </button>
        <button
          type="button"
          className={styles.add}
          onClick={() => addChild({ type: 'not', child: defaultCmp() })}
        >
          + NOT
        </button>
      </div>
    </div>
  );
};

const NodeEditor = (props: {
  node: FilterNode;
  onChange: (n: FilterNode) => void;
  onRemove: () => void;
}) => {
  const { node, onChange, onRemove } = props;
  if (node.type === 'cmp') {
    return <CmpEditor node={node} onChange={onChange} onRemove={onRemove} />;
  }
  if (node.type === 'not') {
    return (
      <div className={styles.notNode}>
        <T.Small weight="bold">NOT</T.Small>
        <div className={styles.notChild}>
          <NodeEditor
            node={node.child}
            onChange={(c) => onChange({ type: 'not', child: c })}
            onRemove={onRemove}
          />
        </div>
      </div>
    );
  }
  return <GroupEditor node={node} onChange={onChange} onRemove={onRemove} />;
};

const CmpEditor = (props: {
  node: CmpNode;
  onChange: (n: CmpNode) => void;
  onRemove: () => void;
}) => {
  const { node, onChange, onRemove } = props;
  const kind = FILTER_FIELDS[node.field].kind;
  const validOps = OPS_BY_KIND[kind];

  const onFieldChange = (field: FilterableField) => {
    const newKind = FILTER_FIELDS[field].kind;
    onChange({
      type: 'cmp',
      field,
      op: OPS_BY_KIND[newKind][0],
      value: newKind === 'number' ? 0 : '',
    });
  };

  return (
    <div className={styles.cmp}>
      <select
        className={styles.select}
        value={node.field}
        onChange={(e) => onFieldChange(e.target.value as FilterableField)}
      >
        {ALL_FIELDS.map((f) => (
          <option key={f} value={f}>
            {FIELD_LABELS[f]}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        value={node.op}
        onChange={(e) => onChange({ ...node, op: e.target.value as FilterOp })}
      >
        {validOps.map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>
      <ValueWidget node={node} onChange={onChange} />
      <button
        type="button"
        className={styles.remove}
        aria-label="Remove condition"
        onClick={onRemove}
      >
        ✕
      </button>
    </div>
  );
};

const ValueWidget = (props: { node: CmpNode; onChange: (n: CmpNode) => void }) => {
  const { node, onChange } = props;
  const kind = FILTER_FIELDS[node.field].kind;
  if (kind === 'number') {
    return (
      <input
        type="number"
        className={styles.value}
        value={typeof node.value === 'number' ? node.value : ''}
        onChange={(e) => onChange({ ...node, value: Number(e.target.value) || 0 })}
      />
    );
  }
  if (kind === 'date') {
    return (
      <input
        type="date"
        className={styles.value}
        value={String(node.value)}
        onChange={(e) => onChange({ ...node, value: e.target.value })}
      />
    );
  }
  return (
    <input
      type="text"
      className={styles.value}
      value={String(node.value)}
      onChange={(e) => onChange({ ...node, value: e.target.value })}
    />
  );
};

const ToggleButton = (props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    className={props.active ? styles.toggleActive : styles.toggleInactive}
    onClick={props.onClick}
  >
    {props.children}
  </button>
);

const ModeSwitch = observer((props: { store: MapListStore }) => {
  const { store } = props;
  const toAdvanced = action(() => {
    store.advancedFilter = simpleFilterToNode(store.simpleFilter) ?? { type: 'and', children: [] };
    store.filterMode = 'advanced';
  });
  const toSimple = action(() => {
    const simple = store.advancedFilter ? nodeToSimpleFilter(store.advancedFilter) : {};
    if (simple != null) {
      store.simpleFilter = simple;
      store.filterMode = 'simple';
      return;
    }
    const ok = window.confirm(
      'Switching to simple filters will discard the parts of your filter that simple mode cannot represent. Continue?'
    );
    if (ok) {
      store.simpleFilter = extractSimpleFilter(store.advancedFilter);
      store.filterMode = 'simple';
    }
  });
  return (
    <button
      type="button"
      className={styles.modeSwitch}
      onClick={store.filterMode === 'simple' ? toAdvanced : toSimple}
    >
      <T.Small color="purple">
        {store.filterMode === 'simple' ? 'Use advanced filters' : 'Use simple filters'}
      </T.Small>
    </button>
  );
});

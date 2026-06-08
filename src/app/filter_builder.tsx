'use client';

import { MapListStore } from 'app/map_list_presenter';
import {
  SIMPLE_FIELDS,
  SimpleField,
  getFieldValue,
  isSimpleFilter,
  setFieldValue,
  toSimpleFilter,
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
  filterableFields,
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
  count: 'count',
};

const FIELD_LABELS: Record<FilterableField, string> = {
  title: 'Title',
  artist: 'Artist',
  author: 'Mapper',
  uploader: 'Uploader',
  description: 'Description',
  tags: 'Tags',
  downloadCount: 'Downloads',
  submissionDate: 'Upload date',
  difficulties: 'Difficulties',
};

// `tags` stays in the filter schema but is hidden from the builder until the tag write-path and its
// dedicated UI land (next PR); today the column is never populated, so the field would match nothing.
const ALL_FIELDS = filterableFields.filter((f) => f !== 'tags');

const simpleFieldKey = (simpleField: SimpleField) => `${simpleField.field}:${simpleField.op}`;

// Derive each simple field's label from the shared field/op labels so they can't drift; date slots
// read as "Uploaded before/after" rather than the bare field label.
const simpleFieldLabel = (simpleField: SimpleField) =>
  FILTER_FIELDS[simpleField.field].kind === 'date'
    ? `Uploaded ${OP_LABELS[simpleField.op]}`
    : FIELD_LABELS[simpleField.field];

const simpleInputType = (simpleField: SimpleField) => {
  const kind = FILTER_FIELDS[simpleField.field].kind;
  if (kind === 'date') {
    return 'date';
  }
  if (kind === 'number' || kind === 'countable') {
    return 'number';
  }
  return 'text';
};

export const FilterBuilder = observer((props: { store: MapListStore; onSearch: () => void }) => {
  const { store, onSearch } = props;
  return (
    <div className={styles.builder}>
      {store.filterMode === 'simple' ? (
        <SimpleBuilder store={store} onSearch={onSearch} />
      ) : (
        <AdvancedBuilder store={store} />
      )}
      {/* Advanced filters are incomplete and have no entry point yet, but a filter rehydrated from a
            URL can still land in advanced mode, so offer switching back to simple (one-way). */}
      {store.filterMode === 'advanced' && <ModeSwitch store={store} />}
    </div>
  );
});

// Summarises the active filter as dismissable pills, shown when the builder is collapsed so it's
// obvious why results are constrained. Simple mode lists one pill per filled field; advanced mode
// can't be summarised cleanly, so it shows a single catch-all pill that clears the whole filter.
export const ActiveFilterPills = observer(
  (props: { store: MapListStore; onSearch: () => void }) => {
    const { store, onSearch } = props;

    if (store.filterMode === 'advanced') {
      if (store.activeFilter == null) {
        return null;
      }
      return (
        <div className={styles.pills}>
          <Pill
            label="Filters are active (advanced)"
            onRemove={action(() => {
              store.filter = undefined;
              onSearch();
            })}
          />
        </div>
      );
    }

    const active = SIMPLE_FIELDS.map((simpleField) => ({
      simpleField,
      value: getFieldValue(store.filter, simpleField),
    })).filter(({ value }) => value.trim() !== '');
    if (active.length === 0) {
      return null;
    }
    return (
      <div className={styles.pills}>
        {active.map(({ simpleField, value }) => (
          <Pill
            key={simpleFieldKey(simpleField)}
            label={`${simpleFieldLabel(simpleField)}: ${value}`}
            onRemove={action(() => {
              store.filter = setFieldValue(store.filter, simpleField, '');
              onSearch();
            })}
          />
        ))}
      </div>
    );
  }
);

const Pill = (props: { label: string; onRemove: () => void }) => (
  <div className={styles.pill}>
    <T.Small>{props.label}</T.Small>
    <button
      type="button"
      className={styles.pillRemove}
      aria-label={`Remove filter: ${props.label}`}
      onClick={props.onRemove}
    >
      ✕
    </button>
  </div>
);

const SimpleBuilder = observer((props: { store: MapListStore; onSearch: () => void }) => {
  const { store, onSearch } = props;
  const setField = action((simpleField: SimpleField, value: string) => {
    store.filter = setFieldValue(store.filter, simpleField, value);
  });
  return (
    <div className={styles.simple}>
      {SIMPLE_FIELDS.map((simpleField) => (
        <Textbox
          key={simpleFieldKey(simpleField)}
          label={simpleFieldLabel(simpleField)}
          error={undefined}
          inputType={simpleInputType(simpleField)}
          value={getFieldValue(store.filter, simpleField)}
          onChange={(v) => setField(simpleField, v)}
          onSubmit={onSearch}
        />
      ))}
    </div>
  );
});

const AdvancedBuilder = observer((props: { store: MapListStore }) => {
  const { store } = props;
  // The root must be a group so conditions/groups can be added to it.
  const node = store.filter;
  const root: FilterNode =
    node && (node.type === 'and' || node.type === 'or')
      ? node
      : { type: 'and', children: node ? [node] : [] };
  const setRoot = action((n: FilterNode) => (store.filter = n));
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
      value: newKind === 'number' || newKind === 'countable' ? 0 : '',
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
  if (kind === 'number' || kind === 'countable') {
    return (
      <input
        type="number"
        className={styles.value}
        // Keep the box blankable: an empty input stays empty (and is pruned before search) rather
        // than snapping to 0, which would silently become e.g. `downloadCount >= 0` (match-all).
        value={typeof node.value === 'number' ? node.value : ''}
        onChange={(e) =>
          onChange({ ...node, value: e.target.value === '' ? '' : Number(e.target.value) })
        }
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
  // Simple and advanced edit the same AST, so switching to advanced needs no conversion.
  const toAdvanced = action(() => {
    store.filterMode = 'advanced';
  });
  const toSimple = action(() => {
    if (isSimpleFilter(store.filter)) {
      store.filterMode = 'simple';
      return;
    }
    const ok = window.confirm(
      'Switching to simple filters will discard the parts of your filter that simple mode cannot represent. Continue?'
    );
    if (ok) {
      store.filter = toSimpleFilter(store.filter);
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

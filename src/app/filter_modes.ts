import { CmpNode, FILTER_FIELDS, FilterNode, FilterOp, FilterableField } from 'schema/map_filter';

/**
 * Simple and advanced filtering differ in their edit model. Advanced mode edits the shared
 * {@link FilterNode} AST directly. Simple mode is a constrained editor: each {@link SimpleField}
 * fixes a `(field, op)` pair and owns a raw string the user types, compiled to the AST only on
 * search ({@link compileSimpleFilter}). A `multi` field treats its value as a comma-separated list
 * of independent terms OR'd together (e.g. mapper `Foo,Bar`, difficulties `1,2`); comma support is a
 * property of the field, not the operator (so `description`, also `contains`, stays single-valued).
 */
export type SimpleField = { field: FilterableField; op: FilterOp; multi?: boolean };

export const SIMPLE_FIELDS: SimpleField[] = [
  { field: 'artist', op: 'contains', multi: true },
  { field: 'author', op: 'contains', multi: true },
  { field: 'description', op: 'contains' },
  { field: 'difficulties', op: 'count', multi: true },
  { field: 'submissionDate', op: 'after' },
  { field: 'submissionDate', op: 'before' },
];

export const simpleFieldKey = (sf: SimpleField) => `${sf.field}:${sf.op}`;

const matches = (node: CmpNode, sf: SimpleField) => node.field === sf.field && node.op === sf.op;

const simpleFieldOf = (node: CmpNode) => SIMPLE_FIELDS.find((sf) => matches(node, sf));

// A simple "slot" is the node holding one field's value: a bare cmp, or - for a `multi` field whose
// value lists several comma terms - an `or` of cmps that all share the slot's (field, op).
function slotCmps(node: FilterNode): CmpNode[] | undefined {
  if (node.type === 'cmp') {
    return [node];
  }
  if (
    node.type === 'or' &&
    node.children.length > 0 &&
    node.children.every((c) => c.type === 'cmp')
  ) {
    return node.children as CmpNode[];
  }
  return undefined;
}

// The simple field a slot represents, iff all its cmps share one simple (field, op). An `or` slot is
// only valid for a `multi` field, since single-valued fields never compile to an OR.
function slotSimpleField(node: FilterNode): SimpleField | undefined {
  const cmps = slotCmps(node);
  if (cmps == null) {
    return undefined;
  }
  const sf = simpleFieldOf(cmps[0]);
  if (sf == null || !cmps.every((c) => matches(c, sf))) {
    return undefined;
  }
  if (node.type === 'or' && !sf.multi) {
    return undefined;
  }
  return sf;
}

// The top-level slots of a simple-shaped filter (a flat `and`, a bare slot, or empty/undefined).
function simpleSlots(filter: FilterNode | undefined): FilterNode[] {
  if (filter == null) {
    return [];
  }
  return filter.type === 'and' ? filter.children : [filter];
}

/**
 * True if the node fits simple mode: empty, or a flat `and` (or a bare slot) whose children are all
 * distinct simple slots - a cmp, or an `or` of comma terms for a `multi` field. Anything else (NOT,
 * nesting, other fields/operators, duplicate fields) needs advanced mode.
 */
export function isSimpleFilter(node: FilterNode | undefined): boolean {
  if (node == null) {
    return true;
  }
  const seen = new Set<SimpleField>();
  for (const slot of simpleSlots(node)) {
    const sf = slotSimpleField(slot);
    if (sf == null || seen.has(sf)) {
      return false;
    }
    seen.add(sf);
  }
  return true;
}

/**
 * Compiles the raw simple-field strings into the {@link FilterNode} AST sent to the backend, API and
 * URL. Run only on search: each field splits on commas when `multi`, trims terms, drops empties,
 * coerces numeric/countable terms (dropping non-numbers), and is omitted entirely when nothing valid
 * remains. Several terms become an `or`, a single term a bare cmp. Returns undefined when empty, so
 * an untouched or all-blank builder behaves like no filter.
 */
export function compileSimpleFilter(values: ReadonlyMap<string, string>): FilterNode | undefined {
  const children: FilterNode[] = [];
  for (const sf of SIMPLE_FIELDS) {
    const node = compileSlot(sf, values.get(simpleFieldKey(sf)) ?? '');
    if (node != null) {
      children.push(node);
    }
  }
  return children.length === 0 ? undefined : { type: 'and', children };
}

function compileSlot(sf: SimpleField, raw: string): FilterNode | undefined {
  const kind = FILTER_FIELDS[sf.field].kind;
  const numeric = kind === 'number' || kind === 'countable';
  const terms = sf.multi ? raw.split(',') : [raw];
  const cmps: CmpNode[] = [];
  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed === '') {
      continue;
    }
    let value: string | number = trimmed;
    if (numeric) {
      const n = Number(trimmed);
      // The difficulties widget is a text input, so it can hold non-numeric junk; drop those terms.
      if (!Number.isFinite(n)) {
        continue;
      }
      value = n;
    }
    cmps.push({ type: 'cmp', field: sf.field, op: sf.op, value });
  }
  if (cmps.length === 0) {
    return undefined;
  }
  return cmps.length === 1 ? cmps[0] : { type: 'or', children: cmps };
}

/**
 * Decompiles a filter back into raw simple-field strings, for URL rehydration and the
 * advanced -> simple switch. Recognized slots become their field's value (joining a `multi` field's
 * OR terms with commas); the first occurrence per field wins and anything not simple-representable is
 * dropped, matching the switch's discard prompt.
 */
export function filterToSimpleValues(node: FilterNode | undefined): Map<string, string> {
  const values = new Map<string, string>();
  const visit = (n: FilterNode) => {
    const sf = slotSimpleField(n);
    if (sf != null) {
      const key = simpleFieldKey(sf);
      if (!values.has(key)) {
        values.set(
          key,
          slotCmps(n)!
            .map((c) => String(c.value))
            .join(',')
        );
      }
      return;
    }
    // Not a recognized slot: salvage simple cmps from inside groups; drop cmps/NOT we can't represent.
    if (n.type === 'and' || n.type === 'or') {
      n.children.forEach(visit);
    }
  };
  if (node != null) {
    visit(node);
  }
  return values;
}

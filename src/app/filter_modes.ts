import { CmpNode, FilterNode, FilterOp, FilterableField } from 'schema/map_filter';

/**
 * Simple and advanced filtering differ only in the UI: both edit the same {@link FilterNode}. Simple
 * mode is a constrained editor over a flat `and` of cmps with pre-selected fields, each
 * {@link SimpleField} fixes a `(field, op)` pair so the user only supplies a value. The helpers here
 * read and write those fields on the shared AST.
 */
export type SimpleField = { field: FilterableField; op: FilterOp };

export const SIMPLE_FIELDS: SimpleField[] = [
  { field: 'artist', op: 'contains' },
  { field: 'author', op: 'contains' },
  { field: 'description', op: 'contains' },
  { field: 'submissionDate', op: 'after' },
  { field: 'submissionDate', op: 'before' },
];

const matches = (node: CmpNode, simpleField: SimpleField) =>
  node.field === simpleField.field && node.op === simpleField.op;

const simpleFieldOf = (node: CmpNode) => SIMPLE_FIELDS.find((sf) => matches(node, sf));

// The cmp children of a simple-shaped filter (a flat `and`, a bare cmp, or empty/undefined).
function simpleCmps(filter: FilterNode | undefined): CmpNode[] {
  if (filter == null) {
    return [];
  }
  if (filter.type === 'cmp') {
    return [filter];
  }
  if (filter.type === 'and') {
    return filter.children.filter((c): c is CmpNode => c.type === 'cmp');
  }
  return [];
}

/**
 * True if the node fits simple mode: empty, a bare cmp, or a flat `and` whose children are all
 * distinct simple fields. Anything else (OR/NOT/nesting, other fields/operators, duplicates) needs
 * advanced mode.
 */
export function isSimpleFilter(node: FilterNode | undefined): boolean {
  if (node == null) {
    return true;
  }
  if (node.type !== 'cmp' && node.type !== 'and') {
    return false;
  }
  const children: FilterNode[] = node.type === 'cmp' ? [node] : node.children;
  const seen = new Set<SimpleField>();
  for (const child of children) {
    if (child.type !== 'cmp') {
      return false;
    }
    const simpleField = simpleFieldOf(child);
    if (simpleField == null || seen.has(simpleField)) {
      return false;
    }
    seen.add(simpleField);
  }
  return true;
}

export function getFieldValue(filter: FilterNode | undefined, simpleField: SimpleField): string {
  const cmp = simpleCmps(filter).find((c) => matches(c, simpleField));
  return cmp == null ? '' : String(cmp.value);
}

/**
 * Immutably sets (or, for a blank value, clears) a simple field on the filter, returning the rebuilt
 * flat `and`, or undefined when no fields remain. Other fields keep their position.
 */
export function setFieldValue(
  filter: FilterNode | undefined,
  simpleField: SimpleField,
  value: string
): FilterNode | undefined {
  const children = [...simpleCmps(filter)];
  const idx = children.findIndex((c) => matches(c, simpleField));
  if (value.trim() === '') {
    if (idx >= 0) {
      children.splice(idx, 1);
    }
  } else {
    const cmp: CmpNode = { type: 'cmp', field: simpleField.field, op: simpleField.op, value };
    if (idx >= 0) {
      children[idx] = cmp;
    } else {
      children.push(cmp);
    }
  }
  return children.length === 0 ? undefined : { type: 'and', children };
}

/**
 * Best-effort reduction of an arbitrary tree to its simple-representable parts, used when the user
 * switches advanced → simple and accepts discarding the incompatible parts. Keeps the first cmp per
 * simple field; `not` subtrees are dropped since a negated clause has no simple form.
 */
export function toSimpleFilter(node: FilterNode | undefined): FilterNode | undefined {
  const children: CmpNode[] = [];
  const seen = new Set<SimpleField>();
  const visit = (n: FilterNode) => {
    if (n.type === 'cmp') {
      const simpleField = simpleFieldOf(n);
      if (simpleField != null && !seen.has(simpleField)) {
        seen.add(simpleField);
        children.push({ ...n });
      }
      return;
    }
    if (n.type === 'not') {
      return;
    }
    n.children.forEach(visit);
  };
  if (node) {
    visit(node);
  }
  return children.length === 0 ? undefined : { type: 'and', children };
}

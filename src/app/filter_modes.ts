import { CmpNode, FilterNode } from 'schema/map_filter';

/**
 * The flat shape that simple mode edits. Each text field compiles to a `contains` cmp and the date
 * fields to `submissionDate` `after`/`before`. Simple mode is just a constrained editor that emits
 * the same {@link FilterNode} AST as advanced mode.
 */
export type SimpleFilter = {
  artist?: string;
  author?: string;
  description?: string;
  after?: string;
  before?: string;
};

type SimpleTextField = 'artist' | 'author' | 'description';
const SIMPLE_TEXT_FIELDS: SimpleTextField[] = ['artist', 'author', 'description'];

export function simpleFilterToNode(simple: SimpleFilter): FilterNode | undefined {
  const children: CmpNode[] = [];
  for (const field of SIMPLE_TEXT_FIELDS) {
    const value = simple[field]?.trim();
    if (value) {
      children.push({ type: 'cmp', field, op: 'contains', value });
    }
  }
  if (simple.after) {
    children.push({ type: 'cmp', field: 'submissionDate', op: 'after', value: simple.after });
  }
  if (simple.before) {
    children.push({ type: 'cmp', field: 'submissionDate', op: 'before', value: simple.before });
  }
  if (children.length === 0) {
    return undefined;
  }
  return { type: 'and', children };
}

// Maps a simple-representable cmp back to the SimpleFilter slot it occupies; null if not simple.
function cmpToSimpleEntry(node: CmpNode): { key: keyof SimpleFilter; value: string } | null {
  if (typeof node.value !== 'string') {
    return null;
  }
  if (SIMPLE_TEXT_FIELDS.includes(node.field as SimpleTextField) && node.op === 'contains') {
    return { key: node.field as SimpleTextField, value: node.value };
  }
  if (node.field === 'submissionDate' && node.op === 'after') {
    return { key: 'after', value: node.value };
  }
  if (node.field === 'submissionDate' && node.op === 'before') {
    return { key: 'before', value: node.value };
  }
  return null;
}

/**
 * Returns the {@link SimpleFilter} for a node that fits simple's shape, a bare cmp or a flat `and`
 * of supported `contains`/date cmps, with no field used twice. Returns undefined for anything that
 * needs advanced mode (OR/NOT/nesting, other operators/fields, or duplicate slots).
 */
export function nodeToSimpleFilter(node: FilterNode): SimpleFilter | undefined {
  if (node.type !== 'cmp' && node.type !== 'and') {
    return undefined;
  }
  const children: FilterNode[] = node.type === 'cmp' ? [node] : node.children;
  const simple: SimpleFilter = {};
  for (const child of children) {
    if (child.type !== 'cmp') {
      return undefined;
    }
    const entry = cmpToSimpleEntry(child);
    if (entry == null || simple[entry.key] != null) {
      return undefined;
    }
    simple[entry.key] = entry.value;
  }
  return simple;
}

/**
 * Best-effort extraction of the simple-representable parts of an arbitrary tree, used when the user
 * switches advanced → simple and accepts discarding the incompatible parts. Collects the first
 * simple cmp per slot; `not` subtrees are dropped since a negated clause has no simple form.
 */
export function extractSimpleFilter(node: FilterNode | undefined): SimpleFilter {
  const simple: SimpleFilter = {};
  const visit = (n: FilterNode) => {
    if (n.type === 'cmp') {
      const entry = cmpToSimpleEntry(n);
      if (entry != null && simple[entry.key] == null) {
        simple[entry.key] = entry.value;
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
  return simple;
}

import { difficulties, maps } from 'zapatos/schema';
import { z } from 'zod';

/**
 * Typed, backend-agnostic filter AST for the map search. The UI (simple and advanced modes), the
 * URL transport, and the Postgres compiler all share this one format. The whole design assumes a
 * user can only reference the curated columns in `FILTER_FIELDS`, never `visibility`/`validity`,
 * which are forced server-side.
 */

type FieldKind = 'string' | 'stringArray' | 'number' | 'date' | 'countable';

/**
 * Single source of truth for filterable fields. Column-backed fields reference the real `maps`
 * column so the compiler can use it directly; the `maps.Column` constraint guarantees only real
 * columns appear. `countable` fields instead reference a related table (`relation`) and the foreign
 * key back to `maps`, so the compiler can emit a `count(*)` correlated subquery (see `compileCmp`).
 */
export const FILTER_FIELDS = {
  title: { kind: 'string', column: 'title' },
  artist: { kind: 'string', column: 'artist' },
  author: { kind: 'string', column: 'author' },
  uploader: { kind: 'string', column: 'uploader' },
  description: { kind: 'string', column: 'description' },
  tags: { kind: 'stringArray', column: 'tags' },
  downloadCount: { kind: 'number', column: 'download_count' },
  submissionDate: { kind: 'date', column: 'submission_date' },
  difficulties: { kind: 'countable', relation: 'difficulties', foreignKey: 'map_id' },
} as const satisfies Record<
  string,
  | { kind: 'string' | 'stringArray' | 'number' | 'date'; column: maps.Column }
  | { kind: 'countable'; relation: difficulties.Table; foreignKey: difficulties.Column }
>;

export type FilterableField = keyof typeof FILTER_FIELDS;

export const OPS_BY_KIND = {
  string: ['eq', 'neq', 'contains', 'startsWith'],
  stringArray: ['has'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  date: ['before', 'after', 'gte', 'lte'],
  countable: ['count'],
} as const satisfies Record<FieldKind, readonly string[]>;

export type FilterOp = (typeof OPS_BY_KIND)[keyof typeof OPS_BY_KIND][number];

// Derived from OPS_BY_KIND (deduped) so a new operator only has to be added in one place; a missing
// entry here would otherwise be accepted by validateCmp but rejected by the `z.enum` discriminator.
const FILTER_OPS = [...new Set(Object.values(OPS_BY_KIND).flat())] as [FilterOp, ...FilterOp[]];

const MAX_DEPTH = 5;
const MAX_NODES = 50;

export type CmpNode = {
  type: 'cmp';
  field: FilterableField;
  op: FilterOp;
  value: string | number;
};
export type FilterNode =
  | CmpNode
  | { type: 'and'; children: FilterNode[] }
  | { type: 'or'; children: FilterNode[] }
  | { type: 'not'; child: FilterNode };

export const filterableFields = Object.keys(FILTER_FIELDS) as [
  FilterableField,
  ...FilterableField[],
];

const cmpNode = z.object({
  type: z.literal('cmp'),
  field: z.enum(filterableFields),
  op: z.enum(FILTER_OPS),
  value: z.union([z.string(), z.number()]),
});

// `children`/`child` recurse via `z.lazy` so they read `structuralFilterNode` only at parse time,
// after the const has been initialised.
const andNode = z.object({
  type: z.literal('and'),
  children: z.array(z.lazy((): z.ZodType<FilterNode> => structuralFilterNode)),
});
const orNode = z.object({
  type: z.literal('or'),
  children: z.array(z.lazy((): z.ZodType<FilterNode> => structuralFilterNode)),
});
const notNode = z.object({
  type: z.literal('not'),
  child: z.lazy((): z.ZodType<FilterNode> => structuralFilterNode),
});

// Structural validation only (shape + discriminator). Semantic checks (op/value coherence, depth,
// node count) run once over the whole tree in the `superRefine` below.
const structuralFilterNode: z.ZodType<FilterNode> = z.lazy(() =>
  z.discriminatedUnion('type', [cmpNode, andNode, orNode, notNode])
);

// Accept a date (`YYYY-MM-DD`, from `<input type="date">`) or a full ISO datetime, and reject lenient
// `Date.parse` inputs like '2021' or 'June 1'. The trailing `Date.parse` check rejects shapes that
// look valid but aren't a real date (e.g. '2021-13-99').
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([Tt ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?([Zz]|[+-]\d{2}:?\d{2})?)?$/;
const isIsoDateString = (value: string) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));

function validateCmp(node: CmpNode, ctx: z.RefinementCtx) {
  const field = FILTER_FIELDS[node.field];
  const validOps: readonly string[] = OPS_BY_KIND[field.kind];
  if (!validOps.includes(node.op)) {
    ctx.addIssue({
      code: 'custom',
      message: `Operator "${node.op}" is not valid for field "${node.field}" (${field.kind})`,
    });
    return;
  }
  switch (field.kind) {
    case 'number':
    case 'countable':
      if (typeof node.value !== 'number') {
        ctx.addIssue({ code: 'custom', message: `Field "${node.field}" requires a numeric value` });
      }
      return;
    case 'date':
      if (typeof node.value !== 'string' || !isIsoDateString(node.value)) {
        ctx.addIssue({
          code: 'custom',
          message: `Field "${node.field}" requires an ISO date string`,
        });
      }
      return;
    case 'string':
    case 'stringArray':
      if (typeof node.value !== 'string') {
        ctx.addIssue({ code: 'custom', message: `Field "${node.field}" requires a string value` });
      }
      return;
  }
}

function walk(node: FilterNode, depth: number, ctx: z.RefinementCtx): number {
  if (depth > MAX_DEPTH) {
    ctx.addIssue({ code: 'custom', message: `Filter exceeds max depth of ${MAX_DEPTH}` });
    return 1;
  }
  switch (node.type) {
    case 'cmp':
      validateCmp(node, ctx);
      return 1;
    case 'not':
      return 1 + walk(node.child, depth + 1, ctx);
    case 'and':
    case 'or':
      return node.children.reduce((sum, child) => sum + walk(child, depth + 1, ctx), 1);
  }
}

export const FilterNode: z.ZodType<FilterNode> = structuralFilterNode.superRefine((node, ctx) => {
  const total = walk(node, 1, ctx);
  if (total > MAX_NODES) {
    ctx.addIssue({ code: 'custom', message: `Filter exceeds max node count of ${MAX_NODES}` });
  }
});

/**
 * Normalizes a filter for sending to the backend, API and URL: trims string values, drops incomplete
 * leaves (cmps blank after trimming) and the empty groups that result, returning undefined when
 * nothing meaningful remains. Lets an untouched or partially-filled builder behave like no filter
 * rather than erroring server-side or matching everything (e.g. `downloadCount >= 0` from a cleared
 * number input, or `ILIKE '%%'` from a blank text input), and stops stray surrounding whitespace from
 * breaking text matches.
 */
export function normalizeFilter(node: FilterNode | undefined): FilterNode | undefined {
  if (node == null) {
    return undefined;
  }
  if (node.type === 'cmp') {
    // Numbers (incl. 0) are always real values. String values are trimmed and dropped when nothing
    // remains, matching simple mode's setFieldValue.
    if (typeof node.value !== 'string') {
      return node;
    }
    const trimmed = node.value.trim();
    return trimmed === '' ? undefined : { ...node, value: trimmed };
  }
  if (node.type === 'not') {
    const child = normalizeFilter(node.child);
    return child == null ? undefined : { type: 'not', child };
  }
  const children = node.children.map(normalizeFilter).filter((c): c is FilterNode => c != null);
  return children.length === 0 ? undefined : { type: node.type, children };
}

/* Transport: one opaque base64url param, rather than nested `qs` brackets. */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeFilter(node: FilterNode): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(node)));
}

type DecodeFilterResult = { success: true; value: FilterNode } | { success: false };

/**
 * Returns a Result rather than throwing, matching the codebase's error handling. Fails on any
 * malformed input: bad base64, bad JSON, schema violation, or depth/node-count breach.
 */
export function decodeFilter(raw: string): DecodeFilterResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(raw)));
  } catch {
    return { success: false };
  }
  const result = FilterNode.safeParse(parsed);
  if (!result.success) {
    return { success: false };
  }
  return { success: true, value: result.data };
}

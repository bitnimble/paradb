import { maps } from 'zapatos/schema';
import { z } from 'zod';

/**
 * Typed, backend-agnostic filter AST for the map search. The UI (simple and advanced modes), the
 * URL transport, and the Postgres compiler all share this one format. The whole design assumes a
 * user can only reference the curated columns in `FILTER_FIELDS`, never `visibility`/`validity`,
 * which are forced server-side.
 */

type FieldKind = 'string' | 'stringArray' | 'number' | 'date';

/**
 * Single source of truth for filterable fields. `column` references the real `maps` column so the
 * compiler can use it directly; the `maps.Column` constraint guarantees only real columns appear.
 */
export const FILTER_FIELDS = {
  title: { kind: 'string', column: 'title' },
  artist: { kind: 'string', column: 'artist' },
  author: { kind: 'string', column: 'author' },
  uploader: { kind: 'string', column: 'uploader' },
  description: { kind: 'string', column: 'description' },
  tags: { kind: 'stringArray', column: 'tags' },
  complexity: { kind: 'number', column: 'complexity' },
  downloadCount: { kind: 'number', column: 'download_count' },
  submissionDate: { kind: 'date', column: 'submission_date' },
} as const satisfies Record<string, { kind: FieldKind; column: maps.Column }>;

export type FilterableField = keyof typeof FILTER_FIELDS;

export const OPS_BY_KIND = {
  string: ['eq', 'neq', 'contains', 'startsWith'],
  stringArray: ['has'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  date: ['before', 'after', 'gte', 'lte'],
} as const satisfies Record<FieldKind, readonly string[]>;

const FILTER_OPS = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'has',
  'gt',
  'gte',
  'lt',
  'lte',
  'before',
  'after',
] as const;
export type FilterOp = (typeof FILTER_OPS)[number];

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

const filterableFields = Object.keys(FILTER_FIELDS) as [FilterableField, ...FilterableField[]];

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

const isIsoDateString = (value: string) => !Number.isNaN(Date.parse(value));

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

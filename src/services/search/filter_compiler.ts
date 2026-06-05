import { FILTER_FIELDS, FilterNode } from 'schema/map_filter';
import * as db from 'zapatos/db';
import { maps } from 'zapatos/schema';

/**
 * Compiles a validated {@link FilterNode} tree into a parameterized Postgres condition.
 *
 * This is the core safety boundary of the filter feature:
 * - column names come only from the {@link FILTER_FIELDS} registry, never from user strings;
 * - all values are bound via `db.param`, never interpolated;
 * - LIKE wildcards in user values are escaped so a user-typed `%`/`_` can't alter match semantics.
 *
 * The route Zod-parses before calling this, so the compiler can trust its input.
 */
export function compileFilter(node: FilterNode): db.SQLFragment<boolean> {
  switch (node.type) {
    case 'and':
    case 'or':
      return joinChildren(node);
    case 'not':
      return db.sql<maps.SQL, boolean>`(NOT ${compileFilter(node.child)})`;
    case 'cmp':
      return compileCmp(node);
  }
}

function joinChildren(node: Extract<FilterNode, { type: 'and' | 'or' }>): db.SQLFragment<boolean> {
  const { type, children } = node;
  if (children.length === 0) {
    // Identity element, so an empty group never emits `()`: AND of nothing is TRUE, OR is FALSE.
    return type === 'and' ? db.sql<maps.SQL, boolean>`TRUE` : db.sql<maps.SQL, boolean>`FALSE`;
  }
  const separator =
    type === 'and' ? db.sql<maps.SQL, boolean>` AND ` : db.sql<maps.SQL, boolean>` OR `;
  const compiled = children.map(compileFilter);
  return db.sql<maps.SQL, boolean>`(${db.mapWithSeparator(compiled, separator, (c) => c)})`;
}

// `%`, `_` and `\` are escaped with a backslash so user input matches literally under `ESCAPE '\'`.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// A bare `YYYY-MM-DD` (from `<input type="date">`) carries no timezone, so casting it to
// `timestamptz` would resolve against the session timezone. Anchor it to midnight UTC instead; full
// ISO values already carry their own offset and pass through unchanged.
function toUtcInstant(value: string | number): string | number {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : value;
}

function compileCmp(node: Extract<FilterNode, { type: 'cmp' }>): db.SQLFragment<boolean> {
  const field = FILTER_FIELDS[node.field];
  const column = field.column;
  const { op, value } = node;

  // `submission_date` is `timestamptz`. Bind date values as an absolute instant (anchoring a bare
  // `YYYY-MM-DD` to midnight UTC) so comparisons are independent of the server session's timezone.
  const param =
    field.kind === 'date'
      ? db.sql<maps.SQL>`${db.param(toUtcInstant(value))}::timestamptz`
      : db.sql<maps.SQL>`${db.param(value)}`;

  switch (op) {
    case 'eq':
      return db.sql<maps.SQL, boolean>`${column} = ${param}`;
    case 'neq':
      // `IS DISTINCT FROM`, not `!=`, so rows where the column is NULL count as "not equal" rather
      // than being silently dropped by SQL three-valued logic.
      return db.sql<maps.SQL, boolean>`${column} IS DISTINCT FROM ${param}`;
    case 'gt':
    case 'after':
      return db.sql<maps.SQL, boolean>`${column} > ${param}`;
    case 'gte':
      return db.sql<maps.SQL, boolean>`${column} >= ${param}`;
    case 'lt':
    case 'before':
      return db.sql<maps.SQL, boolean>`${column} < ${param}`;
    case 'lte':
      return db.sql<maps.SQL, boolean>`${column} <= ${param}`;
    case 'contains':
      return db.sql<maps.SQL, boolean>`${column} ILIKE ${db.param(
        `%${escapeLike(String(value))}%`
      )} ESCAPE '\\'`;
    case 'startsWith':
      return db.sql<maps.SQL, boolean>`${column} ILIKE ${db.param(
        `${escapeLike(String(value))}%`
      )} ESCAPE '\\'`;
    case 'has':
      return db.sql<maps.SQL, boolean>`${param} = ANY(${column})`;
  }
}

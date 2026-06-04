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
      return joinChildren(node.children, db.sql<maps.SQL, boolean>` AND `, 'TRUE');
    case 'or':
      return joinChildren(node.children, db.sql<maps.SQL, boolean>` OR `, 'FALSE');
    case 'not':
      return db.sql<maps.SQL, boolean>`(NOT ${compileFilter(node.child)})`;
    case 'cmp':
      return compileCmp(node);
  }
}

function joinChildren(
  children: FilterNode[],
  separator: db.SQLFragment<boolean>,
  empty: 'TRUE' | 'FALSE'
): db.SQLFragment<boolean> {
  if (children.length === 0) {
    // An empty group is normally omitted upstream; degrade to a constant so we never emit `()`.
    return empty === 'TRUE' ? db.sql<maps.SQL, boolean>`TRUE` : db.sql<maps.SQL, boolean>`FALSE`;
  }
  const compiled = children.map(compileFilter);
  return db.sql<maps.SQL, boolean>`(${db.mapWithSeparator(compiled, separator, (c) => c)})`;
}

// `%`, `_` and `\` are escaped with a backslash so user input matches literally under `ESCAPE '\'`.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function compileCmp(node: Extract<FilterNode, { type: 'cmp' }>): db.SQLFragment<boolean> {
  const column = FILTER_FIELDS[node.field].column;
  const { op, value } = node;
  switch (op) {
    case 'eq':
      return db.sql<maps.SQL, boolean>`${column} = ${db.param(value)}`;
    case 'neq':
      return db.sql<maps.SQL, boolean>`${column} != ${db.param(value)}`;
    case 'gt':
    case 'after':
      return db.sql<maps.SQL, boolean>`${column} > ${db.param(value)}`;
    case 'gte':
      return db.sql<maps.SQL, boolean>`${column} >= ${db.param(value)}`;
    case 'lt':
    case 'before':
      return db.sql<maps.SQL, boolean>`${column} < ${db.param(value)}`;
    case 'lte':
      return db.sql<maps.SQL, boolean>`${column} <= ${db.param(value)}`;
    case 'contains':
      return db.sql<maps.SQL, boolean>`${column} ILIKE ${db.param(
        `%${escapeLike(String(value))}%`
      )} ESCAPE '\\'`;
    case 'startsWith':
      return db.sql<maps.SQL, boolean>`${column} ILIKE ${db.param(
        `${escapeLike(String(value))}%`
      )} ESCAPE '\\'`;
    case 'has':
      return db.sql<maps.SQL, boolean>`${db.param(value)} = ANY(${column})`;
  }
}

import { MapSortableAttributes, MapVisibility } from 'schema/maps';
import { getDbPool } from 'services/db/pool';
import { compileFilter } from 'services/search/filter_compiler';
import * as db from 'zapatos/db';
import { maps } from 'zapatos/schema';
import { MapDocument, SearchIndex, SearchOptions, SearchResult } from './types';

const SORTABLE_COLUMNS: Partial<
  Record<MapSortableAttributes, maps.Column | db.SQLFragment<any, never>>
> = {
  title: 'title',
  artist: 'artist',
  author: 'author',
  favorites: db.sql`lateral_favorites`,
  submissionDate: 'submission_date',
  downloadCount: 'download_count',
};

const SORTABLE_LATERAL: Partial<Record<MapSortableAttributes, db.SQLFragment<number, never>>> = {
  favorites: db.count('favorites', { map_id: db.parent('id') }),
};

type SortDirection = 'ASC' | 'DESC';

export class PostgresIndex implements SearchIndex {
  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const pool = await getDbPool();

    // Every ORDER BY below ends with `id` so tied sort keys (equal ranks, dates, etc.) get a stable
    // total order, and offset pagination can't drop or duplicate rows across page boundaries.
    // TODO: switch to keyset ("WHERE > last") pagination so a concurrent insert can't shift the
    // offset window either.
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    const filter = options?.filter;

    // Build sort config from options
    let sortOrder:
      | { by: maps.Column | db.SQLFragment<any, never>; direction: SortDirection }
      | undefined;
    let sortLateral: Record<string, db.SQLFragment<number, never>> | undefined;
    if (options?.sort && options.sort.length > 0) {
      const { attribute, direction } = options.sort[0];
      const by = SORTABLE_COLUMNS[attribute];
      if (by) {
        sortOrder = { by, direction: direction.toUpperCase() as SortDirection };
        if (attribute in SORTABLE_LATERAL) {
          sortLateral = { [attribute]: SORTABLE_LATERAL[attribute]! };
        }
      }
    }

    let results;
    let totalCount: number;
    const queryMostRecent = () => {
      const conditions = db.conditions.and(
        { visibility: MapVisibility.PUBLIC },
        ...(filter ? [compileFilter(filter)] : [])
      );
      return Promise.all([
        db
          .select('maps', conditions, {
            columns: ['id'],
            lateral: sortLateral,
            order: [
              sortOrder ?? { by: 'submission_date', direction: 'DESC' },
              { by: 'id', direction: 'ASC' },
            ],
            limit,
            offset,
          })
          .run(pool),
        db.count('maps', conditions).run(pool),
      ]);
    };

    if (query.trim() === '') {
      [results, totalCount] = await queryMostRecent();
    } else {
      // A hyphen between two alphanumeric characters (e.g. "spider-man") is part of a word, not a
      // search operator, so collapse it to a space: the parts are then ANDed and a search matches
      // "Spider-Man" and "Spider Man" alike. A whitespace-padded " - " is left intact as a
      // websearch negation operator.
      const normalizedQuery = query.replace(/(?<=[\p{L}\p{N}])-(?=[\p{L}\p{N}])/gu, ' ');
      const [{ tsquery }] = await db.sql<
        db.Parameter,
        [{ tsquery: string }]
      >`select websearch_to_tsquery('english', ${db.param(normalizedQuery)})::text as tsquery`.run(
        pool
      );
      if (tsquery.trim() === '') {
        [results, totalCount] = await queryMostRecent();
      } else {
        // Make the trailing lexeme a prefix match (search-as-you-type) - but only when the tsquery
        // ends in a plain lexeme. A websearch result ending in ')' (a phrase or negation group)
        // would become invalid tsquery syntax with a bare ':*' appended.
        const prefixTsquery = tsquery.endsWith("'") ? `${tsquery}:*` : tsquery;
        const tsqueryPartial = db.sql<maps.SQL, string>`${db.param(prefixTsquery)}::tsquery`;

        const lowerQuery = query.toLowerCase();
        const exactMatch = db.sql<maps.SQL, boolean>`(
          LOWER(${'title'}) = ${db.param(lowerQuery)} OR
          LOWER(${'artist'}) = ${db.param(lowerQuery)} OR
          LOWER(${'author'}) = ${db.param(lowerQuery)}
        )`;
        const ftsMatch = db.sql<maps.SQL, boolean>`${'fts'} @@ ${tsqueryPartial}`;
        const rank = db.sql<maps.SQL, number>`ts_rank_cd(${'fts'}, ${tsqueryPartial})`;

        // Filter on `ftsMatch` alone so the query can use the `fts` GIN index. `exactMatch` only
        // boosts exact title/artist/author hits to the top of the FTS results in the ordering
        // below, where it is evaluated over the matched rows rather than forcing a full scan. (A
        // whitespace-padded "Artist - Title" name is a websearch negation and so isn't matched by
        // FTS; we intentionally don't special-case it.)
        const conditions = db.conditions.and(
          { visibility: MapVisibility.PUBLIC },
          ftsMatch,
          ...(filter ? [compileFilter(filter)] : [])
        );
        [results, totalCount] = await Promise.all([
          db
            .select('maps', conditions, {
              columns: ['id'],
              lateral: sortLateral,
              order: sortOrder
                ? [sortOrder, { by: 'id', direction: 'ASC' }]
                : [
                    { by: exactMatch, direction: 'DESC' },
                    { by: rank, direction: 'DESC' },
                    { by: 'id', direction: 'ASC' },
                  ],
              limit,
              offset,
            })
            .run(pool),
          db.count('maps', conditions).run(pool),
        ]);
      }
    }

    return {
      hits: results.map((r) => ({ id: r.id })),
      totalCount,
    };
  }

  async updateDocuments(_documents: MapDocument[]): Promise<void> {
    // No-op: data is already in Postgres
  }

  async deleteDocument(_id: string): Promise<void> {
    // No-op: deletion is handled by the maps repo directly
  }
}

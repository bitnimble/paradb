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

    // TODO: ensure correctness of pagination by using "WHERE >" instead of offset + limit
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
    const queryMostRecent = () => {
      return db
        .select(
          'maps',
          db.conditions.and(
            { visibility: MapVisibility.PUBLIC },
            ...(filter ? [compileFilter(filter)] : [])
          ),
          {
            columns: ['id'],
            lateral: sortLateral,
            order: sortOrder ?? {
              by: 'submission_date',
              direction: 'DESC',
            },
            limit,
            offset,
          }
        )
        .run(pool);
    };

    if (query.trim() === '') {
      results = await queryMostRecent();
    } else {
      const [{ tsquery }] = await db.sql<
        db.Parameter,
        [{ tsquery: string }]
      >`select websearch_to_tsquery('english', ${db.param(query)})::text as tsquery`.run(pool);
      if (tsquery.trim() === '') {
        results = await queryMostRecent();
      } else {
        const tsqueryPartial = db.sql<maps.SQL, string>`(${db.param(tsquery)} || ':*')::tsquery`;

        const lowerQuery = query.toLowerCase();
        const exactMatch = db.sql<maps.SQL, boolean>`(
          LOWER(${'title'}) = ${db.param(lowerQuery)} OR
          LOWER(${'artist'}) = ${db.param(lowerQuery)} OR
          LOWER(${'author'}) = ${db.param(lowerQuery)}
        )`;
        const ftsMatch = db.sql<maps.SQL, boolean>`${'fts'} @@ ${tsqueryPartial}`;
        const rank = db.sql<maps.SQL, number>`ts_rank_cd(${'fts'}, ${tsqueryPartial})`;

        results = await db
          .select(
            'maps',
            db.conditions.and(
              { visibility: MapVisibility.PUBLIC },
              db.sql`(${exactMatch} OR ${ftsMatch})`,
              ...(filter ? [compileFilter(filter)] : [])
            ),
            {
              columns: ['id'],
              lateral: sortLateral,
              order: sortOrder ?? [
                { by: exactMatch, direction: 'DESC' },
                { by: rank, direction: 'DESC' },
              ],
              limit,
              offset,
              extras: {
                rank,
                exactMatch,
              },
            }
          )
          .run(pool);
      }
    }

    return {
      hits: results.map((r) => ({ id: r.id })),
    };
  }

  async updateDocuments(_documents: MapDocument[]): Promise<void> {
    // No-op: data is already in Postgres
  }

  async deleteDocument(_id: string): Promise<void> {
    // No-op: deletion is handled by the maps repo directly
  }
}

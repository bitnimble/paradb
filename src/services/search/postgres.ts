import { MapVisibility } from 'schema/maps';
import { getDbPool } from 'services/db/pool';
import * as db from 'zapatos/db';
import { maps } from 'zapatos/schema';
import { MapDocument, SearchIndex, SearchOptions, SearchResult } from './types';

// Valid sortable fields mapping to snake_case column names
type SortableColumn = 'title' | 'artist' | 'author' | 'submission_date' | 'download_count';
const SORTABLE_FIELDS: Record<string, SortableColumn> = {
  title: 'title',
  artist: 'artist',
  author: 'author',
  submissionDate: 'submission_date',
  downloadCount: 'download_count',
};

export class PostgresIndex implements SearchIndex {
  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const pool = await getDbPool();

    // TODO: ensure correctness of pagination by using "WHERE >" instead of offset + limit
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    // Build order option from sort, default to most recent submissions
    let sortOrder: { by: SortableColumn; direction: 'ASC' | 'DESC' } | undefined;
    if (options?.sort && options.sort.length > 0) {
      const [field, direction] = options.sort[0].split(':');
      const columnName = SORTABLE_FIELDS[field];
      if (columnName) {
        sortOrder = {
          by: columnName,
          direction: direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
        };
      }
    }

    let results;
    const queryMostRecent = () => {
      return db
        .select(
          'maps',
          {
            visibility: MapVisibility.PUBLIC,
          },
          {
            columns: ['id'],
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
        const tsqueryFragment = db.sql<
          maps.SQL,
          string
        >`to_tsquery('english', ${db.param(tsquery)} || ':*')`;

        const rank = db.sql<maps.SQL, number>`ts_rank_cd(${'fts'}, ${tsqueryFragment})`;
        results = await db
          .select(
            'maps',
            db.conditions.and(
              { visibility: MapVisibility.PUBLIC },
              { fts: db.sql`${db.self} @@ ${tsqueryFragment}` }
            ),
            {
              columns: ['id'],
              order: sortOrder ?? {
                by: rank,
                direction: 'DESC',
              },
              limit,
              offset,
              extras: {
                rank,
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
